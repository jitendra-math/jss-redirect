import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getEnv } from '../../config/env';
import { ErrorCode } from '../../lib/errors/error-codes';
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

const validationHook = (result: { success: boolean; error?: { issues: unknown[] } }, c: import('hono').Context<AppEnv>) => {
  if (!result.success) {
    return c.json(
      {
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'The request contains invalid data.',
          details: result.error?.issues.map((issue) => {
            const item = issue as { code?: unknown; path?: unknown; message?: unknown };
            return { code: item.code, path: item.path, message: item.message };
          }),
        },
        requestId: c.get('requestId'),
      },
      400,
    );
  }
};

routes.post('/campaigns', zValidator('json', createCampaignSchema, validationHook), createCampaignHandler);
routes.post('/tokens', zValidator('json', createTrackingTokenSchema, validationHook), createTrackingTokenHandler);

export { routes as trackingRoutes };
