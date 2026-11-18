import { z } from 'zod';

const dateRangeFields = {
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  campaignId: z.uuid().optional(),
};

export const analyticsQuerySchema = z.object({
  ...dateRangeFields,
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).superRefine((value, ctx) => {
  if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
    ctx.addIssue({ code: 'custom', path: ['from'], message: 'The from date must be earlier than or equal to the to date.' });
  }
});

export const analyticsEventsQuerySchema = z.object({
  ...dateRangeFields,
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  recipientRef: z.string().trim().min(1).max(254).optional(),
  linkKey: z.string().trim().min(1).max(40).optional(),
  isAutomated: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
}).superRefine((value, ctx) => {
  if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
    ctx.addIssue({ code: 'custom', path: ['from'], message: 'The from date must be earlier than or equal to the to date.' });
  }
});

export const analyticsRecipientsQuerySchema = z.object({
  campaignId: z.uuid(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});

export const analyticsLinksQuerySchema = z.object({ campaignId: z.uuid().optional() });
export const analyticsExportQuerySchema = z.object({ campaignId: z.uuid() });
