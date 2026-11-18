import type { Context } from 'hono';
import type { AppEnv } from '../../types/hono-env.js';
import {
  buildAnalyticsEvents,
  buildAnalyticsSummary,
  buildLinkPerformance,
  buildRecipientCsv,
  buildRecipientReport,
  type AnalyticsEventsQuery,
  type AnalyticsQuery,
} from './analytics.service.js';

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

export async function analyticsEventsHandler(c: Context<AppEnv>) {
  const from = c.req.query('from');
  const to = c.req.query('to');
  const campaignId = c.req.query('campaignId');
  const recipientRef = c.req.query('recipientRef');
  const linkKey = c.req.query('linkKey');
  const isAutomated = c.req.query('isAutomated');
  const query: AnalyticsEventsQuery = {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(campaignId ? { campaignId } : {}),
    ...(recipientRef ? { recipientRef } : {}),
    ...(linkKey ? { linkKey } : {}),
    ...(isAutomated === 'true' ? { isAutomated: true } : {}),
    ...(isAutomated === 'false' ? { isAutomated: false } : {}),
    limit: Number(c.req.query('limit') ?? 50),
    offset: Number(c.req.query('offset') ?? 0),
  };
  const result = await buildAnalyticsEvents(query);
  return c.json({ data: result, requestId: c.get('requestId') });
}

export async function analyticsRecipientsHandler(c: Context<AppEnv>) {
  const result = await buildRecipientReport(
    c.req.query('campaignId') ?? '',
    Number(c.req.query('limit') ?? 100),
    Number(c.req.query('offset') ?? 0),
  );
  return c.json({ data: result, requestId: c.get('requestId') });
}

export async function analyticsLinksHandler(c: Context<AppEnv>) {
  const campaignId = c.req.query('campaignId');
  const result = await buildLinkPerformance(campaignId);
  return c.json({ data: result, count: result.length, requestId: c.get('requestId') });
}

export async function analyticsExportHandler(c: Context<AppEnv>) {
  const campaignId = c.req.query('campaignId') ?? '';
  const csv = await buildRecipientCsv(campaignId);
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="jss-redirect-${campaignId}.csv"`);
  c.header('Cache-Control', 'no-store');
  return c.body(csv);
}
