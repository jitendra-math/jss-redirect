import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { internalApiKeyMiddleware } from '../../middleware/internal-api-key.middleware.js';
import { createRateLimitMiddleware } from '../../middleware/rate-limit.middleware.js';
import { getEnv } from '../../config/env.js';
import type { AppEnv } from '../../types/hono-env.js';
import { dynamicRedirectHandler, fixedRedirectHandler } from './redirect.controller.js';
import {
  createRedirectLink,
  deactivateRedirectLink,
  getRedirectLinks,
  updateRedirectLinkById,
} from './redirect.service.js';
import {
  createRedirectLinkSchema,
  redirectLinkIdParamsSchema,
  redirectLinksQuerySchema,
  redirectQuerySchema,
  redirectSlugParamsSchema,
  updateRedirectLinkSchema,
} from './redirect.validation.js';

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
routes.use('/api/redirect-links/*', apiRateLimit, internalApiKeyMiddleware);

const listLinksHandler = async (c: Context<AppEnv>) => {
  const links = await getRedirectLinks(c.req.query('campaignId'));
  return c.json({ data: links, count: links.length, requestId: c.get('requestId') });
};

routes.get('/api/redirect-links', zValidator('query', redirectLinksQuerySchema), listLinksHandler);
routes.get('/api/redirect-links/', zValidator('query', redirectLinksQuerySchema), listLinksHandler);

routes.post('/api/redirect-links', zValidator('json', createRedirectLinkSchema), async (c) => {
  const input = c.req.valid('json');
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
  const link = await createRedirectLink({
    slug: input.slug,
    destinationKey: input.destinationKey ?? input.linkKey ?? 'custom',
    ...(input.destinationUrl ? { destinationUrl: input.destinationUrl } : {}),
    ...(input.linkKey ? { linkKey: input.linkKey } : {}),
    ...(input.label ? { label: input.label } : {}),
    ...(input.campaignId ? { campaignId: input.campaignId } : {}),
    ...(expiresAt ? { expiresAt } : {}),
  });

  return c.json({ data: link, requestId: c.get('requestId') }, 201);
});

routes.patch(
  '/api/redirect-links/:id',
  zValidator('param', redirectLinkIdParamsSchema),
  zValidator('json', updateRedirectLinkSchema),
  async (c) => {
    const input = c.req.valid('json');
    const expiresAt = input.expiresAt === undefined
      ? undefined
      : input.expiresAt === null ? null : new Date(input.expiresAt);
    const link = await updateRedirectLinkById(c.req.param('id'), {
      ...(input.destinationUrl !== undefined ? { destinationUrl: input.destinationUrl } : {}),
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(expiresAt !== undefined ? { expiresAt } : {}),
    });
    return c.json({ data: link, requestId: c.get('requestId') });
  },
);

routes.delete('/api/redirect-links/:id', zValidator('param', redirectLinkIdParamsSchema), async (c) => {
  const link = await deactivateRedirectLink(c.req.param('id'));
  return c.json({ data: link, requestId: c.get('requestId') });
});

export { routes as redirectRoutes };
