import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { campaigns } from '../../db/schema/campaigns.js';
import { redirectLinks } from '../../db/schema/redirect-links.js';
import type { CreateRedirectLinkInput } from './redirect.types.js';

export async function findActiveRedirectBySlug(slug: string) {
  const now = new Date();

  const rows = await db
    .select()
    .from(redirectLinks)
    .where(
      and(
        eq(redirectLinks.slug, slug),
        eq(redirectLinks.isActive, true),
        or(isNull(redirectLinks.expiresAt), gt(redirectLinks.expiresAt, now)),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function findCampaignById(id: string) {
  const rows = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findRedirectBySlug(slug: string) {
  const rows = await db.select().from(redirectLinks).where(eq(redirectLinks.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function insertRedirectLink(input: CreateRedirectLinkInput) {
  const rows = await db
    .insert(redirectLinks)
    .values({
      slug: input.slug,
      destinationKey: input.destinationKey,
      campaignId: input.campaignId ?? null,
      expiresAt: input.expiresAt ?? null,
    })
    .returning();

  return rows[0];
}
