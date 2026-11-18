import { z } from 'zod';
import { destinationKeys } from '../../config/destinations.js';
import { destinationUrlSchema } from '../../lib/destination-url.js';

const safeKeySchema = z.string().trim().min(1).max(40).regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/);

export const redirectQuerySchema = z.object({
  cid: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
});

export const redirectSlugParamsSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(1).max(80),
});

export const createRedirectLinkSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(1).max(80),
  destinationKey: z.union([z.enum(destinationKeys), safeKeySchema]).optional(),
  destinationUrl: destinationUrlSchema.optional(),
  linkKey: safeKeySchema.optional(),
  label: z.string().trim().min(1).max(100).optional(),
  campaignId: z.uuid().optional(),
  expiresAt: z.iso.datetime({ offset: true }).optional(),
}).superRefine((value, ctx) => {
  if (!value.destinationKey && !value.destinationUrl) {
    ctx.addIssue({ code: 'custom', path: ['destinationUrl'], message: 'Provide destinationKey or destinationUrl.' });
  }
});

export const redirectLinkIdParamsSchema = z.object({ id: z.uuid() });

export const updateRedirectLinkSchema = z.object({
  destinationUrl: destinationUrlSchema.optional(),
  label: z.string().trim().min(1).max(100).nullable().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided.',
});

export const redirectLinksQuerySchema = z.object({ campaignId: z.uuid().optional() });
