import { randomUUID } from 'node:crypto';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { campaigns } from './campaigns.js';
import { redirectLinks } from './redirect-links.js';
import { trackingTokens } from './tracking-tokens.js';

export const clickEvents = sqliteTable(
  'click_events',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    destinationKey: text('destination_key').notNull(),
    campaignId: text('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    redirectLinkId: text('redirect_link_id').references(() => redirectLinks.id, { onDelete: 'set null' }),
    trackingTokenId: text('tracking_token_id').references(() => trackingTokens.id, { onDelete: 'set null' }),
    recipientRef: text('recipient_ref'),
    requestId: text('request_id').notNull(),
    userAgent: text('user_agent'),
    referrerOrigin: text('referrer_origin'),
    isAutomated: integer('is_automated', { mode: 'boolean' }).notNull().default(false),
    clickedAt: integer('clicked_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index('click_events_clicked_at_idx').on(table.clickedAt),
    index('click_events_campaign_clicked_at_idx').on(table.campaignId, table.clickedAt),
    index('click_events_destination_clicked_at_idx').on(table.destinationKey, table.clickedAt),
    index('click_events_recipient_ref_idx').on(table.recipientRef),
    index('click_events_automated_clicked_at_idx').on(table.isAutomated, table.clickedAt),
  ],
);
