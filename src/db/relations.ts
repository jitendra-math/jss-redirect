import { relations } from 'drizzle-orm';
import { campaigns } from './schema/campaigns';
import { clickEvents } from './schema/click-events';
import { redirectLinks } from './schema/redirect-links';
import { trackingTokens } from './schema/tracking-tokens';

export { campaigns, clickEvents, redirectLinks, trackingTokens };

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  redirectLinks: many(redirectLinks),
  trackingTokens: many(trackingTokens),
  clickEvents: many(clickEvents),
}));

export const redirectLinksRelations = relations(redirectLinks, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [redirectLinks.campaignId],
    references: [campaigns.id],
  }),
  clickEvents: many(clickEvents),
}));

export const trackingTokensRelations = relations(trackingTokens, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [trackingTokens.campaignId],
    references: [campaigns.id],
  }),
  clickEvents: many(clickEvents),
}));

export const clickEventsRelations = relations(clickEvents, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [clickEvents.campaignId],
    references: [campaigns.id],
  }),
  redirectLink: one(redirectLinks, {
    fields: [clickEvents.redirectLinkId],
    references: [redirectLinks.id],
  }),
  trackingToken: one(trackingTokens, {
    fields: [clickEvents.trackingTokenId],
    references: [trackingTokens.id],
  }),
}));
