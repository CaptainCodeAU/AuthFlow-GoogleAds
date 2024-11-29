import { Credentials } from 'google-auth-library'
import { query } from '../config/database'
import { oauth2Client } from '../config/googleOauth'
import { GoogleAdsClient, TokenResponse } from '../types/tokenTypes'
import errorLogService, { ErrorType } from './errorLogService'

export class TokenService {
  async storeNewClient(
    clientName: string,
    clientCustomerId: string,
    oauthClientId: string,
    tokens: Credentials
  ): Promise<GoogleAdsClient> {
    const { refresh_token, access_token, expiry_date } = tokens;

    if (!refresh_token) {
      const error = new Error('Refresh token is required for new client setup');
      await errorLogService.logError({
        clientId: oauthClientId,
        errorType: ErrorType.OAUTH_CONFIG_ERROR,
        errorMessage: error.message,
        additionalDetails: {
          clientName,
          clientCustomerId,
          hasAccessToken: !!access_token
        }
      });
      throw error;
    }

    try {
      const result = await query(
        `INSERT INTO google_ads_clients
         (client_name, client_customer_id, oauth_client_id, refresh_token, access_token, access_token_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          clientName,
          clientCustomerId,
          oauthClientId,
          refresh_token,
          access_token,
          new Date(expiry_date || Date.now())
        ]
      );

      return result.rows[0];
    } catch (error: any) {
      await errorLogService.logError({
        clientId: oauthClientId,
        errorType: ErrorType.DATABASE_ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        additionalDetails: {
          clientName,
          clientCustomerId,
          operation: 'storeNewClient'
        }
      });
      throw error;
    }
  }

  async refreshAccessToken(clientId: string): Promise<TokenResponse> {
    const client = await this.getClientById(clientId);
    if (!client) {
      const error = new Error('Client not found');
      await errorLogService.logError({
        clientId,
        errorType: ErrorType.CLIENT_DEACTIVATED,
        errorMessage: error.message,
        additionalDetails: {
          operation: 'refreshAccessToken'
        }
      });
      throw error;
    }

    oauth2Client.setCredentials({
      refresh_token: client.refresh_token
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await this.updateAccessToken(clientId, credentials);

      return {
        access_token: credentials.access_token!,
        expiry_date: credentials.expiry_date!,
        token_type: credentials.token_type!,
        scope: credentials.scope!
      };
    } catch (error: any) {
      const isInvalidToken = error.message.includes('invalid_grant') ||
                            error.message.includes('invalid_token');

      await errorLogService.logError({
        clientId,
        errorType: isInvalidToken ? ErrorType.INVALID_REFRESH_TOKEN : ErrorType.TOKEN_REFRESH_FAILED,
        errorMessage: error.message,
        errorStack: error.stack,
        additionalDetails: {
          lastTokenRefresh: client.updated_at,
          tokenExpiryDate: client.access_token_expires_at,
          statusCode: error.code || error.status,
          response: error.response?.data
        }
      });

      await this.deactivateClient(clientId);
      throw error;
    }
  }

  private async updateAccessToken(clientId: string, credentials: Credentials): Promise<void> {
    try {
      await query(
        `UPDATE google_ads_clients
         SET access_token = $1,
             access_token_expires_at = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [credentials.access_token, new Date(credentials.expiry_date!), clientId]
      );
    } catch (error: any) {
      await errorLogService.logError({
        clientId,
        errorType: ErrorType.DATABASE_ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        additionalDetails: {
          operation: 'updateAccessToken',
          tokenExpiryDate: new Date(credentials.expiry_date!)
        }
      });
      throw error;
    }
  }

  async getClientById(clientId: string): Promise<GoogleAdsClient | null> {
    try {
      const result = await query(
        'SELECT * FROM google_ads_clients WHERE id = $1 AND is_active = true',
        [clientId]
      );
      return result.rows[0] || null;
    } catch (error: any) {
      await errorLogService.logError({
        clientId,
        errorType: ErrorType.DATABASE_ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        additionalDetails: {
          operation: 'getClientById'
        }
      });
      throw error;
    }
  }

  async deactivateClient(clientId: string): Promise<void> {
    try {
      await query(
        `UPDATE google_ads_clients
         SET is_active = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [clientId]
      );

      await errorLogService.logError({
        clientId,
        errorType: ErrorType.CLIENT_DEACTIVATED,
        errorMessage: 'Client deactivated due to token refresh failure',
        additionalDetails: {
          deactivationTime: new Date(),
          operation: 'deactivateClient'
        }
      });
    } catch (error: any) {
      await errorLogService.logError({
        clientId,
        errorType: ErrorType.DATABASE_ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        additionalDetails: {
          operation: 'deactivateClient'
        }
      });
      throw error;
    }
  }

  async getExpiringTokens(thresholdMinutes: number = 5): Promise<GoogleAdsClient[]> {
    try {
      const result = await query(
        `SELECT * FROM google_ads_clients
         WHERE is_active = true
         AND access_token_expires_at <= NOW() + INTERVAL '${thresholdMinutes} minutes'`
      );
      return result.rows;
    } catch (error: any) {
      await errorLogService.logError({
        clientId: 'system',
        errorType: ErrorType.DATABASE_ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        additionalDetails: {
          operation: 'getExpiringTokens',
          thresholdMinutes
        }
      });
      throw error;
    }
  }
}

export default new TokenService();
