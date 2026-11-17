import { Hono } from 'hono';
import { validate } from '../../lib/validation/zod-validator';
import { internalApiKeyMiddleware } from '../../middleware/internal-api-key.middleware';
import { createRateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import { getEnv } from '../../config/env';
import type { AppEnv } from '../../types/hono-env';
import { analyticsSummaryHandler } from './analytics.controller';
import { analyticsQuerySchema } from './analytics.validation';

const routes = new Hono<AppEnv>();

routes.use('*', createRateLimitMiddleware({
  windowMs: getEnv().RATE_LIMIT_WINDOW_MS,
  max: getEnv().RATE_LIMIT_MAX,
}));
routes.use('*', internalApiKeyMiddleware);

routes.get('/summary', validate('query', analyticsQuerySchema, 'The query contains invalid data.'), analyticsSummaryHandler);

export { routes as analyticsRoutes };
