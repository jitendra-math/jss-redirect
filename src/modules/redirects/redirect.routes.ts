import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ErrorCode } from '../../lib/errors/error-codes';
import { internalApiKeyMiddleware } from '../../middleware/internal-api-key.middleware';
import { createRateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import { getEnv } from '../../config/env';
import type { AppEnv } from '../../types/hono-env';
import { dynamicRedirectHandler, fixedRedirectHandler } from './redirect.controller';
import { createRedirectLink } from './redirect.service';
import { createRedirectLinkSchema, redirectQuerySchema, redirectSlugParamsSchema } from './redirect.validation';

const routes = new Hono<AppEnv>();
const apiRateLimit = createRateLimitMiddleware({
  windowMs: getEnv().RATE_LIMIT_WINDOW_MS,
  max: getEnv().RATE_LIMIT_MAX,
});

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

routes.get('/whatsapp', zValidator<typeof redirectQuerySchema, 'query', AppEnv, string>('query', redirectQuerySchema, validationHook), fixedRedirectHandler('whatsapp'));
routes.get('/github', zValidator<typeof redirectQuerySchema, 'query', AppEnv, string>('query', redirectQuerySchema, validationHook), fixedRedirectHandler('github'));
routes.get('/website', zValidator<typeof redirectQuerySchema, 'query', AppEnv, string>('query', redirectQuerySchema, validationHook), fixedRedirectHandler('website'));
routes.get('/work/wa-server', zValidator<typeof redirectQuerySchema, 'query', AppEnv, string>('query', redirectQuerySchema, validationHook), fixedRedirectHandler('wa-server'));
routes.get(
  '/r/:slug',
  zValidator<typeof redirectSlugParamsSchema, 'param', AppEnv, string>('param', redirectSlugParamsSchema, validationHook),
  zValidator<typeof redirectQuerySchema, 'query', AppEnv, string>('query', redirectQuerySchema, validationHook),
  dynamicRedirectHandler,
);

routes.use('/api/redirect-links', apiRateLimit, internalApiKeyMiddleware);
routes.post('/api/redirect-links', zValidator<typeof createRedirectLinkSchema, 'json', AppEnv, string>('json', createRedirectLinkSchema, validationHook), async (c) => {
  const input = c.req.valid('json');
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
  const link = await createRedirectLink({
    slug: input.slug,
    destinationKey: input.destinationKey,
    ...(input.campaignId ? { campaignId: input.campaignId } : {}),
    ...(expiresAt ? { expiresAt } : {}),
  });

  return c.json({ data: link, requestId: c.get('requestId') }, 201);
});

export { routes as redirectRoutes };
