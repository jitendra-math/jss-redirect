import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getEnv } from '../../config/env.js';
import { internalApiKeyMiddleware } from '../../middleware/internal-api-key.middleware.js';
import { createRateLimitMiddleware } from '../../middleware/rate-limit.middleware.js';
import type { AppEnv } from '../../types/hono-env.js';
import { createCampaignHandler, createTrackingTokenHandler } from './tracking.controller.js';
import { createCampaignSchema, createTrackingTokenSchema } from './tracking.validation.js';

const routes = new Hono<AppEnv>();

routes.use('*', createRateLimitMiddleware({
  windowMs: getEnv().RATE_LIMIT_WINDOW_MS,
  max: getEnv().RATE_LIMIT_MAX,
}));
routes.use('*', internalApiKeyMiddleware);

routes.post('/campaigns', zValidator('json', createCampaignSchema), createCampaignHandler);
routes.post('/tokens', zValidator('json', createTrackingTokenSchema), createTrackingTokenHandler);

export { routes as trackingRoutes };
