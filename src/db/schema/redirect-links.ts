import { randomUUID } from 'node:crypto';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { campaigns } from './campaigns.js';

export const redirectLinks = sqliteTable(
  'redirect_links',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    slug: text('slug').notNull().unique(),
    destinationKey: text('destination_key').notNull(),
    campaignId: text('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index('redirect_links_campaign_id_idx').on(table.campaignId),
    index('redirect_links_active_idx').on(table.isActive),
  ],
);
