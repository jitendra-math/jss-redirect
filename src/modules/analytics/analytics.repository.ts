import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { campaigns } from '../../db/schema/campaigns.js';
import { clickEvents } from '../../db/schema/click-events.js';

type AnalyticsFilters = {
  from?: Date;
  to?: Date;
  campaignId?: string;
  limit: number;
};

function buildConditions(filters: AnalyticsFilters) {
  const conditions: SQL[] = [];

  if (filters.from) conditions.push(gte(clickEvents.clickedAt, filters.from));
  if (filters.to) conditions.push(lte(clickEvents.clickedAt, filters.to));
  if (filters.campaignId) conditions.push(eq(clickEvents.campaignId, filters.campaignId));

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
