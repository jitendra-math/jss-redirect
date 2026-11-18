import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ErrorCode } from './error-codes.js';

export class AppError extends Error {
  readonly statusCode: ContentfulStatusCode;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: ContentfulStatusCode,
    details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
