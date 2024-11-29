# AuthFlow-GoogleAds -  Google Ads OAuth Token Management System

## Overview
This project provides a robust solution for managing Google Ads API authentication tokens, focusing on secure, automated token refresh and management. It handles the complete OAuth flow, token storage, and automated refresh cycles, with comprehensive error tracking and analysis capabilities.

## Features
- Automated token refresh mechanism
- Secure token storage in PostgreSQL
- Background worker for token monitoring
- Express server for OAuth flow
- TypeScript support for type safety
- Comprehensive error logging and analysis
- Environment-based configuration
- Error tracking with detailed context
- Error analytics and reporting
- Automated retry mechanisms

### Token Refresh Flow
```mermaid
graph TD
    A[Client Initiates OAuth] --> B[Generate Authorization URL]
    B --> C[User Consent]
    C --> D[Receive Authorization Code]
    D --> E[Exchange for Refresh Token]
    E --> F[Store in Database]
    F --> G[Periodic Token Refresh]
    G --> H{Token Valid?}
    H -->|Yes| I[Update Access Token]
    H -->|No| J[Trigger Re-Authorization]
    J --> K[Log Error]
    K --> L{Retryable?}
    L -->|Yes| M[Exponential Backoff]
    M --> G
    L -->|No| N[Deactivate Client]
```

## Key Components

### 1. Token Storage (PostgreSQL)
- Securely stores OAuth tokens
- Tracks token lifecycle
- Enables efficient token management

#### Database Schema
##### Google Ads Clients Table
- `id`: Unique identifier
- `client_name`: Friendly client name
- `client_customer_id`: Google Ads account ID
- `oauth_client_id`: OAuth credentials
- `refresh_token`: Encrypted long-lived token
- `access_token`: Short-lived access token
- `access_token_expires_at`: Token expiration
- `is_active`: Authorization status

##### Error Logs Table
- `id`: Unique identifier
- `client_id`: Reference to client
- `error_type`: Categorized error type
- `error_message`: Detailed error description
- `error_stack`: Stack trace for debugging
- `additional_details`: JSONB for flexible metadata
- `created_at`: Error timestamp

### 2. Token Refresh Mechanisms

#### A. Cron-based Refresh
- Runs hourly
- Checks for soon-to-expire tokens
- Proactively refreshes access tokens

#### B. Event-Driven Background Worker
- Uses message queues (BullMQ)
- More flexible token management
- Better error handling and scalability

### 3. Error Logging System
- Structured error categorization
- Detailed error context capture
- Performance-optimized queries
- Error analytics and trends
- Client error history tracking

## Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Google Ads API access
- Google Cloud Console project with OAuth 2.0 credentials

## Installation

1. Clone the repository:
```bash
git clone https://github.com/username/google-ads-oauth.git
cd google-ads-oauth
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

## Configuration Requirements

### Environment Variables
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://localhost:6379  # For event-driven approach
```

4. Set up the database:
```bash
npm run setup-db
```

## Token Lifecycle Management

### Access Token
- Validity: Typically 1 hour
- Refresh: Before expiration
- Mechanism: Automatic background refresh

### Refresh Token
- Validity: Months to years
- Regeneration: Only on user action or revocation

## Edge Cases and Error Handling

### Token Refresh Failures
1. Network Issues
2. Google API Temporary Unavailability
3. Revoked Permissions

#### Handling Strategies
- Exponential backoff with jitter
- Comprehensive error logging with context
- Structured error categorization
- Error analytics and trending
- Admin notification system
- Automatic re-authorization trigger
- Retry mechanism for transient failures

### Error Types
- TOKEN_REFRESH_FAILED
- INVALID_REFRESH_TOKEN
- CLIENT_DEACTIVATED
- OAUTH_CONFIG_ERROR
- API_ERROR
- DATABASE_ERROR

## Security Considerations
- Encrypt all tokens at rest
- Use environment-based configuration
- Implement secure token storage
- Regular security audits
- Error stack sanitization
- Sensitive data redaction in logs

## Monitoring and Logging
- Track refresh success rates
- Comprehensive error logging
- Error pattern analysis
- Client error history
- Performance metrics
- Create alerts for persistent failures
- Error trending and analytics

## Development
Start the development server with hot reloading:
```bash
npm run dev
```

Other available scripts:
- `npm run build` - Build the TypeScript project
- `npm start` - Run the built project
- `npm run watch` - Run with nodemon for development

## Project Structure
```
google-ads-oauth/
│
├── src/
│   ├── config/
│   │   ├── database.ts           # Database connection configuration
│   │   └── googleOauth.ts        # Google OAuth configuration
│   │
│   ├── services/
│   │   ├── tokenRefreshManager.ts    # Main token refresh logic
│   │   ├── tokenService.ts           # Token-related utility functions
│   │   └── errorLogService.ts        # Error logging and analysis
│   │
│   ├── models/
│   │   └── googleAdsClient.ts        # Database model definition
│   │
│   ├── utils/
│   │   ├── errorHandler.ts           # Custom error handling
│   │   └── logger.ts                 # Logging utility
│   │
│   └── types/
│       └── tokenTypes.ts             # TypeScript interfaces
│
├── scripts/
│   ├── setup-database.sql            # Database schema creation script
│   └── oauth-error-logging.sql       # Error logging table setup
│
├── docs/
│   └── RFC-001-oauth-error-logging.md # Error logging system design doc
│
├── README.md                         # Project documentation
├── CHANGELOG.md                      # Version history and changes
├── package.json
└── tsconfig.json
```

## Deployment Recommendations
1. Use managed PostgreSQL
2. Implement Redis for queue management
3. Set up proper environment segregation
4. Use secret management services
5. Configure error monitoring alerts
6. Set up log retention policies

## Troubleshooting

### Common Issues
- Token not refreshing
- Authorization failures
- Expired refresh tokens
- Error logging issues

### Diagnostic Steps
1. Check database connection
2. Verify environment variables
3. Review error logs and patterns
4. Analyze error trends
5. Test manual token refresh
6. Check error log table

## Future Improvements
- Advanced monitoring dashboard
- Automatic cleanup of stale tokens
- Error analytics dashboard
- Log aggregation system
- Automated error pattern detection

## License
This project is licensed under the ISC License.

## Changelog
See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.
