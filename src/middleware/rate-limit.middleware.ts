import { createMiddleware } from 'hono/factory';
import { ErrorCode } from '../lib/errors/error-codes.js';
import type { AppEnv } from '../types/hono-env.js';

type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const entries = new Map<string, RateLimitEntry>();

  return createMiddleware<AppEnv>(async (c, next) => {
    const forwardedFor = c.req.header('x-forwarded-for');
    const clientAddress = c.req.header('x-real-ip') ?? forwardedFor?.split(',')[0]?.trim() ?? 'unknown';
    const key = `${clientAddress}:${c.req.path}`;
    const now = Date.now();
    const current = entries.get(key);

    if (!current || current.resetAt <= now) {
      entries.set(key, { count: 1, resetAt: now + options.windowMs });
    } else if (current.count >= options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      c.header('Retry-After', String(retryAfterSeconds));
      return c.json(
        {
          error: {
            code: ErrorCode.RATE_LIMITED,
            message: 'Too many requests. Try again later.',
          },
          requestId: c.get('requestId'),
        },
        429,
      );
    } else {
      current.count += 1;
    }

    if (entries.size > 10000) {
      for (const [entryKey, entry] of entries) {
        if (entry.resetAt <= now) entries.delete(entryKey);
      }
    }

    await next();
  });
}
