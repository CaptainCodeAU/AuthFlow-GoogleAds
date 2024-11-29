import dotenv from 'dotenv'
import express, { Request, Response } from 'express'
import { getAuthUrl, oauth2Client } from './config/googleOauth'
import tokenRefreshManager from './services/tokenRefreshManager'
import tokenService from './services/tokenService'

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Root route handler
app.get('/', (_req: Request, res: Response): void => {
  const authUrl = getAuthUrl();
  res.send(`
    <h1>Google Ads OAuth Token Management</h1>
    <p>Click below to start the OAuth process:</p>
    <a href="${authUrl}">Authorize with Google Ads</a>
  `);
});

// OAuth callback route handler
app.get('/oauth/callback', async (req: Request, res: Response): Promise<void> => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    res.status(400).send('Authorization code is required');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    // Store the tokens for a demo client
    const client = await tokenService.storeNewClient(
      'Demo Client',
      process.env.GOOGLE_ADS_CLIENT_CUSTOMER_ID || '',
      process.env.GOOGLE_CLIENT_ID || '',
      tokens
    );

    res.send(`
      <h1>Authorization Successful!</h1>
      <p>Client ID: ${client.id}</p>
      <p>Access Token will expire at: ${client.access_token_expires_at}</p>
      <p>Token refresh manager is running in the background to keep tokens fresh.</p>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Failed to complete OAuth process');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  tokenRefreshManager.start().catch(console.error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  tokenRefreshManager.stop();
  process.exit(0);
});
