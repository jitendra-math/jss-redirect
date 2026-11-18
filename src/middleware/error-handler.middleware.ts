import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { AppError } from '../lib/errors/app-error.js';
import { ErrorCode } from '../lib/errors/error-codes.js';
import { logger } from '../lib/logger.js';
import type { AppEnv } from '../types/hono-env.js';

export const errorHandler: ErrorHandler<AppEnv> = (error, c) => {
  const requestId = c.get('requestId');

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error('Request failed', {
        requestId,
        code: error.code,
        message: error.message,
      });
    }

    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
        requestId,
      },
      error.statusCode,
    );
  }

  logger.error('Unhandled request error', {
    requestId,
    errorName: error.name,
    message: error.message,
  });

  return c.json(
    {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred.',
      },
      requestId,
    },
    500 as ContentfulStatusCode,
  );
};
