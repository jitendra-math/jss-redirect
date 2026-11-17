import { z } from 'zod';

export const createCampaignSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(2).max(80),
  name: z.string().trim().min(2).max(120),
});

export const createTrackingTokenSchema = z.object({
  campaignId: z.uuid().optional(),
  recipientRef: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
});
