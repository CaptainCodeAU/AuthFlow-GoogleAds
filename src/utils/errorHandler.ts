import errorLogService, { ErrorType } from '../services/errorLogService'

export class OAuth2Error extends Error {
  constructor(
    message: string,
    public clientId?: string,
    public additionalDetails?: Record<string, any>
  ) {
    super(message);
    this.name = 'OAuth2Error';
    this.logError();
  }

  private async logError(): Promise<void> {
    await errorLogService.logError({
      clientId: this.clientId || 'system',
      errorType: ErrorType.OAUTH_CONFIG_ERROR,
      errorMessage: this.message,
      errorStack: this.stack,
      additionalDetails: this.additionalDetails
    });
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public clientId?: string,
    public additionalDetails?: Record<string, any>
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.logError();
  }

  private async logError(): Promise<void> {
    await errorLogService.logError({
      clientId: this.clientId || 'system',
      errorType: ErrorType.DATABASE_ERROR,
      errorMessage: this.message,
      errorStack: this.stack,
      additionalDetails: this.additionalDetails
    });
  }
}

export class TokenRefreshError extends Error {
  constructor(
    message: string,
    public clientId: string,
    public additionalDetails?: Record<string, any>
  ) {
    super(message);
    this.name = 'TokenRefreshError';
    this.logError();
  }

  private async logError(): Promise<void> {
    await errorLogService.logError({
      clientId: this.clientId,
      errorType: ErrorType.TOKEN_REFRESH_FAILED,
      errorMessage: this.message,
      errorStack: this.stack,
      additionalDetails: this.additionalDetails
    });
  }
}

export class InvalidTokenError extends Error {
  constructor(
    message: string,
    public clientId: string,
    public additionalDetails?: Record<string, any>
  ) {
    super(message);
    this.name = 'InvalidTokenError';
    this.logError();
  }

  private async logError(): Promise<void> {
    await errorLogService.logError({
      clientId: this.clientId,
      errorType: ErrorType.INVALID_REFRESH_TOKEN,
      errorMessage: this.message,
      errorStack: this.stack,
      additionalDetails: this.additionalDetails
    });
  }
}

export const handleError = async (
  error: Error,
  clientId?: string,
  additionalDetails?: Record<string, any>
): Promise<void> => {
  let errorType: ErrorType;

  if (error instanceof OAuth2Error) {
    errorType = ErrorType.OAUTH_CONFIG_ERROR;
  } else if (error instanceof DatabaseError) {
    errorType = ErrorType.DATABASE_ERROR;
  } else if (error instanceof TokenRefreshError) {
    errorType = ErrorType.TOKEN_REFRESH_FAILED;
  } else if (error instanceof InvalidTokenError) {
    errorType = ErrorType.INVALID_REFRESH_TOKEN;
  } else if (error.message.includes('API')) {
    errorType = ErrorType.API_ERROR;
  } else {
    errorType = ErrorType.OAUTH_CONFIG_ERROR;
  }

  await errorLogService.logError({
    clientId: clientId || 'system',
    errorType,
    errorMessage: error.message,
    errorStack: error.stack,
    additionalDetails: {
      ...additionalDetails,
      errorName: error.name,
      timestamp: new Date()
    }
  });

  // Log to console for immediate visibility
  console.error(`[${errorType}] ${error.name}:`, {
    message: error.message,
    clientId,
    ...additionalDetails
  });
};

export const isRetryableError = (error: Error): boolean => {
  // Network errors or temporary API issues should be retried
  if (
    error.message.includes('ECONNRESET') ||
    error.message.includes('ETIMEDOUT') ||
    error.message.includes('429') || // Too Many Requests
    error.message.includes('503') || // Service Unavailable
    error.message.includes('504')    // Gateway Timeout
  ) {
    return true;
  }

  // Don't retry authentication or validation errors
  if (
    error instanceof InvalidTokenError ||
    error.message.includes('invalid_grant') ||
    error.message.includes('invalid_client')
  ) {
    return false;
  }

  return false;
};

export const getRetryDelay = (attempt: number, baseDelay: number = 1000): number => {
  // Exponential backoff with jitter
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), 30000);
  const jitter = Math.random() * 1000;
  return exponentialDelay + jitter;
};
