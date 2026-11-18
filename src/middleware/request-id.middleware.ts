import { randomUUID } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types/hono-env.js';

export const requestIdMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const requestId = randomUUID();
  c.set('requestId', requestId);
  await next();
  c.header('x-request-id', requestId);
});
