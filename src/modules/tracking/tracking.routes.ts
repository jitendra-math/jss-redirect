import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getEnv } from '../../config/env';
import { internalApiKeyMiddleware } from '../../middleware/internal-api-key.middleware';
import { createRateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import type { AppEnv } from '../../types/hono-env';
import { createCampaignHandler, createTrackingTokenHandler } from './tracking.controller';
import { createCampaignSchema, createTrackingTokenSchema } from './tracking.validation';

const routes = new Hono<AppEnv>();

routes.use('*', createRateLimitMiddleware({
  windowMs: getEnv().RATE_LIMIT_WINDOW_MS,
  max: getEnv().RATE_LIMIT_MAX,
}));
routes.use('*', internalApiKeyMiddleware);

routes.post('/campaigns', zValidator('json', createCampaignSchema), createCampaignHandler);
routes.post('/tokens', zValidator('json', createTrackingTokenSchema), createTrackingTokenHandler);

export { routes as trackingRoutes };
