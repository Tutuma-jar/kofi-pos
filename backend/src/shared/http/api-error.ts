import { errorCodes, type ErrorCode } from './error-codes.js';

export class ApiError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.status = errorCodes[code];
  }
}
