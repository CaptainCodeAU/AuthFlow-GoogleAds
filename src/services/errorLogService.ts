import { query } from '../config/database'

export enum ErrorType {
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  CLIENT_DEACTIVATED = 'CLIENT_DEACTIVATED',
  OAUTH_CONFIG_ERROR = 'OAUTH_CONFIG_ERROR',
  API_ERROR = 'API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

export interface ErrorLogEntry {
  clientId: string;
  errorType: ErrorType;
  errorMessage: string;
  errorStack?: string;
  additionalDetails?: Record<string, any>;
}

export interface ErrorLogFilters {
  clientId?: string;
  errorType?: ErrorType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class ErrorLogService {
  async logError(entry: ErrorLogEntry): Promise<void> {
    try {
      await query(
        `INSERT INTO oauth_error_logs
         (client_id, error_type, error_message, error_stack, additional_details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          entry.clientId,
          entry.errorType,
          entry.errorMessage,
          entry.errorStack,
          entry.additionalDetails ? JSON.stringify(entry.additionalDetails) : null
        ]
      );
    } catch (error) {
      console.error('Failed to log error:', error);
      // Don't throw here to prevent error logging failures from affecting main flow
    }
  }

  async getErrorLogs(filters: ErrorLogFilters = {}): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters.clientId) {
      conditions.push(`client_id = $${paramCount}`);
      params.push(filters.clientId);
      paramCount++;
    }

    if (filters.errorType) {
      conditions.push(`error_type = $${paramCount}`);
      params.push(filters.errorType);
      paramCount++;
    }

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramCount}`);
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramCount}`);
      params.push(filters.endDate);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = filters.limit ? `LIMIT ${filters.limit}` : '';
    const offsetClause = filters.offset ? `OFFSET ${filters.offset}` : '';

    const result = await query(
      `SELECT * FROM oauth_error_logs
       ${whereClause}
       ORDER BY created_at DESC
       ${limitClause}
       ${offsetClause}`,
      params
    );

    return result.rows;
  }

  async getErrorStats(startDate: Date, endDate: Date): Promise<any> {
    const result = await query(
      `SELECT
         error_type,
         COUNT(*) as error_count,
         COUNT(DISTINCT client_id) as affected_clients_count
       FROM oauth_error_logs
       WHERE created_at BETWEEN $1 AND $2
       GROUP BY error_type
       ORDER BY error_count DESC`,
      [startDate, endDate]
    );

    return result.rows;
  }

  async getClientErrorHistory(clientId: string, limit: number = 100): Promise<any[]> {
    const result = await query(
      `SELECT * FROM oauth_error_logs
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [clientId, limit]
    );

    return result.rows;
  }
}

export default new ErrorLogService();
