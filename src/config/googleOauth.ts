import dotenv from 'dotenv'
import { OAuth2Client } from 'google-auth-library'
import { OAuthConfig } from '../types/tokenTypes'

dotenv.config();

const oauthConfig: OAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
  scope: [
    'https://www.googleapis.com/auth/adwords'
  ]
};

export const oauth2Client = new OAuth2Client(
  oauthConfig.clientId,
  oauthConfig.clientSecret,
  oauthConfig.redirectUri
);

export const getAuthUrl = (): string => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: oauthConfig.scope,
    prompt: 'consent'
  });
};

export default oauthConfig;
