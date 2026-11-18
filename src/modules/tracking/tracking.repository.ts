import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { campaigns } from '../../db/schema/campaigns.js';
import { clickEvents } from '../../db/schema/click-events.js';
import { redirectLinks } from '../../db/schema/redirect-links.js';
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

export async function findCampaignRecordById(id: string) {
  const rows = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listCampaignRecords() {
  return db.select().from(campaigns).orderBy(desc(campaigns.createdAt)).limit(500);
}

export async function getCampaignCounts(campaignId: string) {
  const [recipientRows, linkRows, eventRows, tokenRows] = await Promise.all([
    db.select({ value: sql<number>`count(distinct ${trackingTokens.recipientRef})` })
      .from(trackingTokens).where(eq(trackingTokens.campaignId, campaignId)),
    db.select({ value: sql<number>`count(*)` })
      .from(redirectLinks).where(eq(redirectLinks.campaignId, campaignId)),
    db.select({ value: sql<number>`count(*)` })
      .from(clickEvents).where(eq(clickEvents.campaignId, campaignId)),
    db.select({ value: sql<number>`count(*)` })
      .from(trackingTokens).where(eq(trackingTokens.campaignId, campaignId)),
  ]);

  return {
    recipients: Number(recipientRows[0]?.value ?? 0),
    campaignLinks: Number(linkRows[0]?.value ?? 0),
    clicks: Number(eventRows[0]?.value ?? 0),
    trackingTokens: Number(tokenRows[0]?.value ?? 0),
  };
}


export async function findCampaignRedirectLinkByKey(campaignId: string, linkKey: string) {
  const rows = await db.select().from(redirectLinks)
    .where(and(eq(redirectLinks.campaignId, campaignId), eq(redirectLinks.linkKey, linkKey)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findRedirectLinkForToken(id: string) {
  const rows = await db.select({ id: redirectLinks.id, campaignId: redirectLinks.campaignId })
    .from(redirectLinks).where(eq(redirectLinks.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function insertTrackingToken(input: {
  tokenHash: string;
  campaignId: string | null;
  redirectLinkId?: string | null;
  recipientRef: string;
  expiresAt: Date;
}) {
  const rows = await db.insert(trackingTokens).values({
    tokenHash: input.tokenHash,
    campaignId: input.campaignId,
    redirectLinkId: input.redirectLinkId ?? null,
    recipientRef: input.recipientRef,
    expiresAt: input.expiresAt,
  }).returning({
    id: trackingTokens.id,
    campaignId: trackingTokens.campaignId,
    recipientRef: trackingTokens.recipientRef,
    expiresAt: trackingTokens.expiresAt,
    createdAt: trackingTokens.createdAt,
  });
  return rows[0];
}

export async function insertBulkLinksAndTokens(
  linkRows: Array<typeof redirectLinks.$inferInsert>,
  tokenRows: Array<typeof trackingTokens.$inferInsert>,
) {
  await db.transaction(async (tx) => {
    if (linkRows.length > 0) {
      await tx.insert(redirectLinks).values(linkRows);
    }

    // SQLite/Turso bind-parameter limits vary. Keep each insert comfortably small.
    const chunkSize = 100;
    for (let index = 0; index < tokenRows.length; index += chunkSize) {
      const chunk = tokenRows.slice(index, index + chunkSize);
      await tx.insert(trackingTokens).values(chunk);
    }
  });
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

export async function revokeTrackingToken(id: string, revokedAt: Date) {
  const rows = await db.update(trackingTokens)
    .set({ revokedAt })
    .where(and(eq(trackingTokens.id, id), isNull(trackingTokens.revokedAt)))
    .returning({ id: trackingTokens.id, recipientRef: trackingTokens.recipientRef, revokedAt: trackingTokens.revokedAt });
  return rows[0] ?? null;
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
