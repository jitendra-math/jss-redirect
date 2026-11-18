import { z } from 'zod';
import { destinationKeys } from '../../config/destinations.js';

export const redirectQuerySchema = z.object({
  cid: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
});

export const redirectSlugParamsSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(1).max(80),
});

export const createRedirectLinkSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(1).max(80),
  destinationKey: z.enum(destinationKeys),
  campaignId: z.uuid().optional(),
  expiresAt: z.iso.datetime({ offset: true }).optional(),
});
