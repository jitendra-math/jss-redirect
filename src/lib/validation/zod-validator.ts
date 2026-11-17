import { zValidator as honoZValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodType } from 'zod';
import { ErrorCode } from '../errors/error-codes';
import type { AppEnv } from '../../types/hono-env';

/**
 * Shared Zod validator configured with the application's Hono environment.
 * Keeping the hook inline lets TypeScript infer the validator result and the
 * validated request target from the supplied schema.
 */
export function validate<T extends ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
  message = 'The request contains invalid data.',
) {
  return honoZValidator<T, Target, AppEnv, string>(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message,
            details: result.error.issues.map((issue) => ({
              code: issue.code,
              path: issue.path,
              message: issue.message,
            })),
          },
          requestId: c.get('requestId'),
        },
        400,
      );
    }
  });
}
