import { timingSafeEqual } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import { getEnv } from '../config/env.js';
import { AppError } from '../lib/errors/app-error.js';
import { ErrorCode } from '../lib/errors/error-codes.js';
import type { AppEnv } from '../types/hono-env.js';

function matchesSecret(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);

  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

export const internalApiKeyMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authorization = c.req.header('authorization') ?? '';
  const [scheme, candidate] = authorization.split(' ', 2);
  const expected = getEnv().INTERNAL_API_KEY;

  if (scheme !== 'Bearer' || !candidate || !matchesSecret(candidate, expected)) {
    throw new AppError('A valid bearer token is required.', ErrorCode.UNAUTHORIZED, 401);
  }

  await next();
});
