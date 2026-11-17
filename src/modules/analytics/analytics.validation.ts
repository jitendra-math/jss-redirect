import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  campaignId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).superRefine((value, ctx) => {
  if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
    ctx.addIssue({
      code: 'custom',
      path: ['from'],
      message: 'The from date must be earlier than or equal to the to date.',
    });
  }
});
