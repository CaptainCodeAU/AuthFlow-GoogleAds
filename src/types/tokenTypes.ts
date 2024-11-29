export interface GoogleAdsClient {
  id: string;
  client_name: string;
  client_customer_id: string;
  oauth_client_id: string;
  refresh_token: string;
  access_token: string;
  access_token_expires_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
  token_type: string;
  scope: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}
