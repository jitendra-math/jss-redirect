import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { internalApiKeyMiddleware } from '../../middleware/internal-api-key.middleware.js';
import { createRateLimitMiddleware } from '../../middleware/rate-limit.middleware.js';
import { getEnv } from '../../config/env.js';
import type { AppEnv } from '../../types/hono-env.js';
import { analyticsSummaryHandler } from './analytics.controller.js';
import { analyticsQuerySchema } from './analytics.validation.js';

const routes = new Hono<AppEnv>();

routes.use('*', createRateLimitMiddleware({
  windowMs: getEnv().RATE_LIMIT_WINDOW_MS,
  max: getEnv().RATE_LIMIT_MAX,
}));
routes.use('*', internalApiKeyMiddleware);

routes.get('/summary', zValidator('query', analyticsQuerySchema), analyticsSummaryHandler);

export { routes as analyticsRoutes };
