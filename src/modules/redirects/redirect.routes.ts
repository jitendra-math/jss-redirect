import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
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

routes.get('/whatsapp', zValidator('query', redirectQuerySchema), fixedRedirectHandler('whatsapp'));
routes.get('/github', zValidator('query', redirectQuerySchema), fixedRedirectHandler('github'));
routes.get('/website', zValidator('query', redirectQuerySchema), fixedRedirectHandler('website'));
routes.get('/work/wa-server', zValidator('query', redirectQuerySchema), fixedRedirectHandler('wa-server'));
routes.get(
  '/r/:slug',
  zValidator('param', redirectSlugParamsSchema),
  zValidator('query', redirectQuerySchema),
  dynamicRedirectHandler,
);

routes.use('/api/redirect-links', apiRateLimit, internalApiKeyMiddleware);
routes.post('/api/redirect-links', zValidator('json', createRedirectLinkSchema), async (c) => {
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
