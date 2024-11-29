import { GoogleAdsClient } from '../types/tokenTypes'
import errorLogService, { ErrorType } from './errorLogService'
import tokenService from './tokenService'

export class TokenRefreshManager {
  private isRunning: boolean = false;
  private readonly refreshIntervalMs: number = 60 * 1000; // 1 minute
  private readonly tokenExpiryThresholdMinutes: number = 5;

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Token refresh manager is already running');
      return;
    }

    this.isRunning = true;
    console.log('Token refresh manager started');
    this.scheduleRefresh();
  }

  stop(): void {
    this.isRunning = false;
    console.log('Token refresh manager stopped');
  }

  private scheduleRefresh(): void {
    if (!this.isRunning) return;

    setTimeout(async () => {
      try {
        await this.refreshExpiredTokens();
      } catch (error: any) {
        await errorLogService.logError({
          clientId: 'system',
          errorType: ErrorType.TOKEN_REFRESH_FAILED,
          errorMessage: 'Error in token refresh cycle',
          errorStack: error.stack,
          additionalDetails: {
            operation: 'scheduleRefresh',
            timestamp: new Date()
          }
        });
      } finally {
        this.scheduleRefresh();
      }
    }, this.refreshIntervalMs);
  }

  private async refreshExpiredTokens(): Promise<void> {
    try {
      const expiringClients: GoogleAdsClient[] =
        await tokenService.getExpiringTokens(this.tokenExpiryThresholdMinutes);

      console.log(`Found ${expiringClients.length} clients with expiring tokens`);

      for (const client of expiringClients) {
        try {
          await this.refreshClientToken(client);
        } catch (error: any) {
          await errorLogService.logError({
            clientId: client.id,
            errorType: ErrorType.TOKEN_REFRESH_FAILED,
            errorMessage: `Failed to refresh token for client ${client.id}`,
            errorStack: error.stack,
            additionalDetails: {
              operation: 'refreshExpiredTokens',
              clientName: client.client_name,
              clientCustomerId: client.client_customer_id,
              lastRefresh: client.updated_at
            }
          });
        }
      }
    } catch (error: any) {
      await errorLogService.logError({
        clientId: 'system',
        errorType: ErrorType.DATABASE_ERROR,
        errorMessage: 'Error fetching expiring tokens',
        errorStack: error.stack,
        additionalDetails: {
          operation: 'refreshExpiredTokens',
          timestamp: new Date()
        }
      });
    }
  }

  private async refreshClientToken(client: GoogleAdsClient): Promise<void> {
    try {
      console.log(`Refreshing token for client ${client.id}`);

      await tokenService.refreshAccessToken(client.id);

      console.log(`Successfully refreshed token for client ${client.id}`);
    } catch (error: any) {
      await errorLogService.logError({
        clientId: client.id,
        errorType: ErrorType.TOKEN_REFRESH_FAILED,
        errorMessage: `Token refresh failed for client ${client.id}`,
        errorStack: error.stack,
        additionalDetails: {
          operation: 'refreshClientToken',
          clientName: client.client_name,
          clientCustomerId: client.client_customer_id,
          errorCode: error.code || error.status,
          errorResponse: error.response?.data
        }
      });
      throw error;
    }
  }

  // Manual refresh for a specific client
  async refreshSpecificClient(clientId: string): Promise<void> {
    try {
      const client = await tokenService.getClientById(clientId);
      if (!client) {
        await errorLogService.logError({
          clientId,
          errorType: ErrorType.CLIENT_DEACTIVATED,
          errorMessage: `Client ${clientId} not found`,
          additionalDetails: {
            operation: 'refreshSpecificClient',
            timestamp: new Date()
          }
        });
        throw new Error(`Client ${clientId} not found`);
      }
      await this.refreshClientToken(client);
    } catch (error: any) {
      await errorLogService.logError({
        clientId,
        errorType: ErrorType.TOKEN_REFRESH_FAILED,
        errorMessage: `Manual token refresh failed for client ${clientId}`,
        errorStack: error.stack,
        additionalDetails: {
          operation: 'refreshSpecificClient',
          timestamp: new Date()
        }
      });
      throw error;
    }
  }
}

export default new TokenRefreshManager();
