import { randomUUID } from 'node:crypto';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { campaigns } from './campaigns.js';

export const trackingTokens = sqliteTable(
  'tracking_tokens',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    tokenHash: text('token_hash').notNull().unique(),
    campaignId: text('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    recipientRef: text('recipient_ref').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index('tracking_tokens_campaign_id_idx').on(table.campaignId),
    index('tracking_tokens_recipient_ref_idx').on(table.recipientRef),
    index('tracking_tokens_expires_at_idx').on(table.expiresAt),
  ],
);
