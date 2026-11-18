import { z } from 'zod';
import { destinationUrlSchema } from '../../lib/destination-url.js';

const recipientRefSchema = z.string().trim().min(1).max(254).regex(/^[^\s<>]+$/, {
  message: 'recipientRef must not contain spaces or angle brackets.',
});

const linkKeySchema = z.string().trim().min(1).max(40).regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/);

export const createCampaignSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(2).max(80),
  name: z.string().trim().min(2).max(120),
});

export const createTrackingTokenSchema = z.object({
  campaignId: z.uuid().optional(),
  redirectLinkId: z.uuid().optional(),
  recipientRef: recipientRefSchema,
  expiresInDays: z.number().int().min(1).max(3650).optional(),
});

export const bulkTrackingLinksSchema = z.object({
  campaignId: z.uuid(),
  recipients: z.array(z.object({
    email: z.email().transform((value) => value.trim().toLowerCase()),
    recipientRef: recipientRefSchema.optional(),
  })).min(1).max(1000),
  links: z.array(z.object({
    key: linkKeySchema,
    label: z.string().trim().min(1).max(100),
    destinationUrl: destinationUrlSchema,
  })).min(1).max(10),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
}).superRefine((value, ctx) => {
  const emails = value.recipients.map((recipient) => recipient.email);
  const uniqueEmails = new Set(emails);
  if (uniqueEmails.size !== emails.length) {
    ctx.addIssue({ code: 'custom', path: ['recipients'], message: 'Recipient email addresses must be unique in a batch.' });
  }

  const recipientRefs = value.recipients.map((recipient) => recipient.recipientRef?.trim() || recipient.email);
  if (new Set(recipientRefs).size !== recipientRefs.length) {
    ctx.addIssue({ code: 'custom', path: ['recipients'], message: 'Resolved recipient references must be unique in a batch.' });
  }

  if (value.recipients.length * value.links.length > 3000) {
    ctx.addIssue({ code: 'custom', path: ['links'], message: 'A batch can create at most 3,000 personalized links. Split larger campaigns into multiple batches.' });
  }

  const keys = value.links.map((link) => link.key);
  if (new Set(keys).size !== keys.length) {
    ctx.addIssue({ code: 'custom', path: ['links'], message: 'Link keys must be unique within a campaign batch.' });
  }
});

export const campaignIdParamsSchema = z.object({ campaignId: z.uuid() });
export const tokenIdParamsSchema = z.object({ tokenId: z.uuid() });
