import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getEnv } from '../../config/env.js';
import { internalApiKeyMiddleware } from '../../middleware/internal-api-key.middleware.js';
import { createRateLimitMiddleware } from '../../middleware/rate-limit.middleware.js';
import type { AppEnv } from '../../types/hono-env.js';
import {
  createBulkTrackingLinksHandler,
  createCampaignHandler,
  createTrackingTokenHandler,
  getCampaignDetailsHandler,
  listCampaignsHandler,
  revokeTrackingTokenHandler,
} from './tracking.controller.js';
import {
  bulkTrackingLinksSchema,
  campaignIdParamsSchema,
  createCampaignSchema,
  createTrackingTokenSchema,
  tokenIdParamsSchema,
} from './tracking.validation.js';

const routes = new Hono<AppEnv>();

routes.use('*', createRateLimitMiddleware({
  windowMs: getEnv().RATE_LIMIT_WINDOW_MS,
  max: getEnv().RATE_LIMIT_MAX,
}));
routes.use('*', internalApiKeyMiddleware);

routes.get('/campaigns', listCampaignsHandler);
routes.post('/campaigns', zValidator('json', createCampaignSchema), createCampaignHandler);
routes.get('/campaigns/:campaignId', zValidator('param', campaignIdParamsSchema), getCampaignDetailsHandler);
routes.post('/tokens', zValidator('json', createTrackingTokenSchema), createTrackingTokenHandler);
routes.post('/tokens/:tokenId/revoke', zValidator('param', tokenIdParamsSchema), revokeTrackingTokenHandler);
routes.post('/bulk', zValidator('json', bulkTrackingLinksSchema), createBulkTrackingLinksHandler);

export { routes as trackingRoutes };
