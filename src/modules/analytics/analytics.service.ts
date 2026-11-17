import { getAnalyticsSummary } from './analytics.repository';

export type AnalyticsQuery = {
  from?: string;
  to?: string;
  campaignId?: string;
  limit: number;
};

export async function buildAnalyticsSummary(query: AnalyticsQuery) {
  const summary = await getAnalyticsSummary({
    ...(query.from ? { from: new Date(query.from) } : {}),
    ...(query.to ? { to: new Date(query.to) } : {}),
    ...(query.campaignId ? { campaignId: query.campaignId } : {}),
    limit: query.limit,
  });

  return {
    ...summary,
    filters: {
      from: query.from ?? null,
      to: query.to ?? null,
      campaignId: query.campaignId ?? null,
    },
    generatedAt: new Date().toISOString(),
  };
}
