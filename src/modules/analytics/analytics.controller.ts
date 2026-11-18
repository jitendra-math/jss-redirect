import type { Context } from 'hono';
import type { AppEnv } from '../../types/hono-env.js';
import { buildAnalyticsSummary, type AnalyticsQuery } from './analytics.service.js';

export async function analyticsSummaryHandler(c: Context<AppEnv>) {
  const from = c.req.query('from');
  const to = c.req.query('to');
  const campaignId = c.req.query('campaignId');
  const query: AnalyticsQuery = {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(campaignId ? { campaignId } : {}),
    limit: Number(c.req.query('limit') ?? 20),
  };
  const summary = await buildAnalyticsSummary(query);
  return c.json({ data: summary, requestId: c.get('requestId') });
}
