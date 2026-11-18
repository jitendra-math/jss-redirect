import { and, eq, isNull, gt } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { campaigns } from '../../db/schema/campaigns.js';
import { clickEvents } from '../../db/schema/click-events.js';
import { trackingTokens } from '../../db/schema/tracking-tokens.js';

export async function findCampaignBySlug(slug: string) {
  const rows = await db.select().from(campaigns).where(eq(campaigns.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function insertCampaign(input: { slug: string; name: string }) {
  const rows = await db.insert(campaigns).values(input).returning();
  return rows[0];
}

export async function findCampaignById(id: string) {
  const rows = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function insertTrackingToken(input: {
  tokenHash: string;
  campaignId: string | null;
  recipientRef: string;
  expiresAt: Date;
}) {
  const rows = await db.insert(trackingTokens).values(input).returning({
    id: trackingTokens.id,
    campaignId: trackingTokens.campaignId,
    recipientRef: trackingTokens.recipientRef,
    expiresAt: trackingTokens.expiresAt,
    createdAt: trackingTokens.createdAt,
  });
  return rows[0];
}

export async function findUsableTokenByHash(tokenHash: string, now: Date) {
  const rows = await db
    .select()
    .from(trackingTokens)
    .where(
      and(
        eq(trackingTokens.tokenHash, tokenHash),
        isNull(trackingTokens.revokedAt),
        gt(trackingTokens.expiresAt, now),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function updateTokenLastUsedAt(id: string, usedAt: Date) {
  await db.update(trackingTokens).set({ lastUsedAt: usedAt }).where(eq(trackingTokens.id, id));
}

export async function insertClickEvent(input: {
  destinationKey: string;
  campaignId: string | null;
  redirectLinkId: string | null;
  trackingTokenId: string | null;
  recipientRef: string | null;
  requestId: string;
  userAgent: string | null;
  referrerOrigin: string | null;
  isAutomated: boolean;
}) {
  await db.insert(clickEvents).values(input);
}
