import { and, asc, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { campaigns } from '../../db/schema/campaigns.js';
import { clickEvents } from '../../db/schema/click-events.js';
import { redirectLinks } from '../../db/schema/redirect-links.js';
import { trackingTokens } from '../../db/schema/tracking-tokens.js';

type AnalyticsFilters = {
  from?: Date;
  to?: Date;
  campaignId?: string;
  limit: number;
};

type EventFilters = AnalyticsFilters & {
  offset: number;
  recipientRef?: string;
  linkKey?: string;
  isAutomated?: boolean;
};

function buildConditions(filters: AnalyticsFilters) {
  const conditions: SQL[] = [];

  if (filters.from) conditions.push(gte(clickEvents.clickedAt, filters.from));
  if (filters.to) conditions.push(lte(clickEvents.clickedAt, filters.to));
  if (filters.campaignId) conditions.push(eq(clickEvents.campaignId, filters.campaignId));

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function buildEventConditions(filters: EventFilters) {
  const conditions: SQL[] = [];
  if (filters.from) conditions.push(gte(clickEvents.clickedAt, filters.from));
  if (filters.to) conditions.push(lte(clickEvents.clickedAt, filters.to));
  if (filters.campaignId) conditions.push(eq(clickEvents.campaignId, filters.campaignId));
  if (filters.recipientRef) conditions.push(eq(clickEvents.recipientRef, filters.recipientRef));
  if (filters.linkKey) conditions.push(eq(redirectLinks.linkKey, filters.linkKey));
  if (filters.isAutomated !== undefined) conditions.push(eq(clickEvents.isAutomated, filters.isAutomated));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getAnalyticsSummary(filters: AnalyticsFilters) {
  const where = buildConditions(filters);
  const totals = await db
    .select({
      totalClicks: sql<number>`count(*)`,
      humanClicks: sql<number>`sum(case when ${clickEvents.isAutomated} = 0 then 1 else 0 end)`,
      automatedClicks: sql<number>`sum(case when ${clickEvents.isAutomated} = 1 then 1 else 0 end)`,
      uniqueRecipients: sql<number>`count(distinct case when ${clickEvents.isAutomated} = 0 then ${clickEvents.recipientRef} end)`,
    })
    .from(clickEvents)
    .where(where);

  const byDestination = await db
    .select({
      destinationKey: clickEvents.destinationKey,
      clicks: sql<number>`count(*)`,
      humanClicks: sql<number>`sum(case when ${clickEvents.isAutomated} = 0 then 1 else 0 end)`,
      uniqueRecipients: sql<number>`count(distinct case when ${clickEvents.isAutomated} = 0 then ${clickEvents.recipientRef} end)`,
    })
    .from(clickEvents)
    .where(where)
    .groupBy(clickEvents.destinationKey)
    .orderBy(desc(sql`count(*)`))
    .limit(filters.limit);

  const byCampaign = await db
    .select({
      campaignId: clickEvents.campaignId,
      campaignSlug: campaigns.slug,
      campaignName: campaigns.name,
      clicks: sql<number>`count(*)`,
      humanClicks: sql<number>`sum(case when ${clickEvents.isAutomated} = 0 then 1 else 0 end)`,
      uniqueRecipients: sql<number>`count(distinct case when ${clickEvents.isAutomated} = 0 then ${clickEvents.recipientRef} end)`,
    })
    .from(clickEvents)
    .leftJoin(campaigns, eq(clickEvents.campaignId, campaigns.id))
    .where(where)
    .groupBy(clickEvents.campaignId, campaigns.slug, campaigns.name)
    .orderBy(desc(sql`count(*)`))
    .limit(filters.limit);

  return {
    totalClicks: Number(totals[0]?.totalClicks ?? 0),
    humanClicks: Number(totals[0]?.humanClicks ?? 0),
    automatedClicks: Number(totals[0]?.automatedClicks ?? 0),
    uniqueRecipients: Number(totals[0]?.uniqueRecipients ?? 0),
    byDestination: byDestination.map((row) => ({
      ...row,
      clicks: Number(row.clicks),
      humanClicks: Number(row.humanClicks),
      uniqueRecipients: Number(row.uniqueRecipients),
    })),
    byCampaign: byCampaign.map((row) => ({
      ...row,
      clicks: Number(row.clicks),
      humanClicks: Number(row.humanClicks),
      uniqueRecipients: Number(row.uniqueRecipients),
    })),
  };
}

export async function getClickEvents(filters: EventFilters) {
  const where = buildEventConditions(filters);
  const countRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(clickEvents)
    .leftJoin(redirectLinks, eq(clickEvents.redirectLinkId, redirectLinks.id))
    .where(where);
  const rows = await db
    .select({
      id: clickEvents.id,
      campaignId: clickEvents.campaignId,
      campaignName: campaigns.name,
      campaignSlug: campaigns.slug,
      destinationKey: clickEvents.destinationKey,
      redirectLinkId: clickEvents.redirectLinkId,
      slug: redirectLinks.slug,
      linkKey: redirectLinks.linkKey,
      linkLabel: redirectLinks.label,
      destinationUrl: redirectLinks.destinationUrl,
      trackingTokenId: clickEvents.trackingTokenId,
      recipientRef: clickEvents.recipientRef,
      clickedAt: clickEvents.clickedAt,
      userAgent: clickEvents.userAgent,
      referrerOrigin: clickEvents.referrerOrigin,
      isAutomated: clickEvents.isAutomated,
      requestId: clickEvents.requestId,
    })
    .from(clickEvents)
    .leftJoin(campaigns, eq(clickEvents.campaignId, campaigns.id))
    .leftJoin(redirectLinks, eq(clickEvents.redirectLinkId, redirectLinks.id))
    .where(where)
    .orderBy(desc(clickEvents.clickedAt))
    .limit(filters.limit)
    .offset(filters.offset);

  return {
    events: rows.map((row) => ({
      ...row,
      clickedAt: row.clickedAt.toISOString(),
    })),
    total: Number(countRows[0]?.total ?? 0),
  };
}

export async function getCampaignRecipientReport(campaignId: string, limit = 100, offset = 0) {
  const rows = await db
    .select({
      tokenId: trackingTokens.id,
      recipientRef: trackingTokens.recipientRef,
      linkId: redirectLinks.id,
      linkKey: redirectLinks.linkKey,
      linkLabel: redirectLinks.label,
      slug: redirectLinks.slug,
      destinationUrl: redirectLinks.destinationUrl,
      destinationKey: redirectLinks.destinationKey,
      eventId: clickEvents.id,
      clickedAt: clickEvents.clickedAt,
      isAutomated: clickEvents.isAutomated,
    })
    .from(trackingTokens)
    .leftJoin(redirectLinks, eq(trackingTokens.redirectLinkId, redirectLinks.id))
    .leftJoin(clickEvents, eq(clickEvents.trackingTokenId, trackingTokens.id))
    .where(eq(trackingTokens.campaignId, campaignId))
    .orderBy(asc(trackingTokens.recipientRef), asc(redirectLinks.linkKey), asc(clickEvents.clickedAt));

  type LinkStats = {
    linkId: string;
    key: string;
    label: string;
    slug: string;
    destinationUrl: string | null;
    destinationKey: string;
    totalClicks: number;
    humanClicks: number;
    automatedClicks: number;
    firstClickedAt: string | null;
    lastClickedAt: string | null;
  };
  type RecipientStats = {
    recipientRef: string;
    email: string | null;
    totalClicks: number;
    humanClicks: number;
    automatedClicks: number;
    firstClickedAt: string | null;
    lastClickedAt: string | null;
    linksById: Map<string, LinkStats>;
  };

  const recipientMap = new Map<string, RecipientStats>();

  for (const row of rows) {
    let recipient = recipientMap.get(row.recipientRef);
    if (!recipient) {
      recipient = {
        recipientRef: row.recipientRef,
        email: row.recipientRef.includes('@') ? row.recipientRef : null,
        totalClicks: 0,
        humanClicks: 0,
        automatedClicks: 0,
        firstClickedAt: null,
        lastClickedAt: null,
        linksById: new Map(),
      };
      recipientMap.set(row.recipientRef, recipient);
    }

    const clickedAt = row.eventId && row.clickedAt ? row.clickedAt.toISOString() : null;
    if (clickedAt) {
      recipient.totalClicks += 1;
      if (!recipient.firstClickedAt || clickedAt < recipient.firstClickedAt) recipient.firstClickedAt = clickedAt;
      if (!recipient.lastClickedAt || clickedAt > recipient.lastClickedAt) recipient.lastClickedAt = clickedAt;
      if (row.isAutomated) recipient.automatedClicks += 1;
      else recipient.humanClicks += 1;
    }

    if (!row.linkId) continue;

    const link: LinkStats = recipient.linksById.get(row.linkId) ?? {
      linkId: row.linkId,
      key: row.linkKey ?? row.destinationKey ?? 'link',
      label: row.linkLabel ?? row.linkKey ?? row.destinationKey ?? 'Link',
      slug: row.slug ?? '',
      destinationUrl: row.destinationUrl,
      destinationKey: row.destinationKey ?? 'unknown',
      totalClicks: 0,
      humanClicks: 0,
      automatedClicks: 0,
      firstClickedAt: null,
      lastClickedAt: null,
    };

    recipient.linksById.set(row.linkId, link);

    if (clickedAt) {
      link.totalClicks += 1;
      if (row.isAutomated) link.automatedClicks += 1;
      else link.humanClicks += 1;
      if (!link.firstClickedAt || clickedAt < link.firstClickedAt) link.firstClickedAt = clickedAt;
      if (!link.lastClickedAt || clickedAt > link.lastClickedAt) link.lastClickedAt = clickedAt;
    }
  }

  const recipients = [...recipientMap.values()]
    .sort((a, b) => a.recipientRef.localeCompare(b.recipientRef))
    .map((recipient) => {
      const links = [...recipient.linksById.values()]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((link) => ({
          ...link,
          clicked: link.humanClicks > 0,
          status: link.humanClicks > 0 ? 'clicked' as const : 'no_recorded_human_click' as const,
        }));
      const hasHumanClick = recipient.humanClicks > 0;
      return {
        recipientRef: recipient.recipientRef,
        email: recipient.email,
        status: hasHumanClick ? 'clicked' as const : 'no_recorded_human_click' as const,
        totalClicks: recipient.totalClicks,
        humanClicks: recipient.humanClicks,
        automatedClicks: recipient.automatedClicks,
        firstClickedAt: recipient.firstClickedAt,
        lastClickedAt: recipient.lastClickedAt,
        links,
      };
    });

  const clickedRecipients = recipients.filter((recipient) => recipient.humanClicks > 0).length;
  const totalClicks = recipients.reduce((sum, recipient) => sum + recipient.totalClicks, 0);
  const humanClicks = recipients.reduce((sum, recipient) => sum + recipient.humanClicks, 0);
  const automatedClicks = recipients.reduce((sum, recipient) => sum + recipient.automatedClicks, 0);

  return {
    campaignId,
    summary: {
      totalRecipients: recipients.length,
      recipientsWithHumanClick: clickedRecipients,
      recipientsWithoutRecordedHumanClick: recipients.length - clickedRecipients,
      totalClicks,
      humanClicks,
      automatedClicks,
    },
    pagination: {
      limit,
      offset,
      total: recipients.length,
      hasMore: offset + limit < recipients.length,
    },
    recipients: recipients.slice(offset, offset + limit),
  };
}

// Returns the complete recipient report for CSV export.
export async function getEventsForCsv(campaignId: string) {
  return getCampaignRecipientReport(campaignId, 1_000_000, 0);
}

export async function getLinkPerformance(campaignId?: string) {
  const where = campaignId ? eq(redirectLinks.campaignId, campaignId) : undefined;
  const rows = await db
    .select({
      id: redirectLinks.id,
      campaignId: redirectLinks.campaignId,
      campaignName: campaigns.name,
      slug: redirectLinks.slug,
      linkKey: redirectLinks.linkKey,
      label: redirectLinks.label,
      destinationKey: redirectLinks.destinationKey,
      destinationUrl: redirectLinks.destinationUrl,
      isActive: redirectLinks.isActive,
      createdAt: redirectLinks.createdAt,
      totalClicks: sql<number>`count(${clickEvents.id})`,
      humanClicks: sql<number>`sum(case when ${clickEvents.id} is not null and ${clickEvents.isAutomated} = 0 then 1 else 0 end)`,
      automatedClicks: sql<number>`sum(case when ${clickEvents.id} is not null and ${clickEvents.isAutomated} = 1 then 1 else 0 end)`,
      uniqueRecipients: sql<number>`count(distinct case when ${clickEvents.isAutomated} = 0 then ${clickEvents.recipientRef} end)`,
    })
    .from(redirectLinks)
    .leftJoin(campaigns, eq(redirectLinks.campaignId, campaigns.id))
    .leftJoin(clickEvents, eq(clickEvents.redirectLinkId, redirectLinks.id))
    .where(where)
    .groupBy(redirectLinks.id, campaigns.name)
    .orderBy(desc(sql`count(${clickEvents.id})`), desc(redirectLinks.createdAt))
    .limit(1000);

  return rows.map((row) => ({
    ...row,
    totalClicks: Number(row.totalClicks),
    humanClicks: Number(row.humanClicks),
    automatedClicks: Number(row.automatedClicks),
    uniqueRecipients: Number(row.uniqueRecipients),
    createdAt: row.createdAt.toISOString(),
  }));
}

