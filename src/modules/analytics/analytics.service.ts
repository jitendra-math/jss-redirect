import {
  getAnalyticsSummary,
  getCampaignRecipientReport,
  getClickEvents,
  getEventsForCsv,
  getLinkPerformance,
} from './analytics.repository.js';

export type AnalyticsQuery = {
  from?: string;
  to?: string;
  campaignId?: string;
  limit: number;
};

export type AnalyticsEventsQuery = AnalyticsQuery & {
  offset: number;
  recipientRef?: string;
  linkKey?: string;
  isAutomated?: boolean;
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

export async function buildAnalyticsEvents(query: AnalyticsEventsQuery) {
  const result = await getClickEvents({
    ...(query.from ? { from: new Date(query.from) } : {}),
    ...(query.to ? { to: new Date(query.to) } : {}),
    ...(query.campaignId ? { campaignId: query.campaignId } : {}),
    ...(query.recipientRef ? { recipientRef: query.recipientRef } : {}),
    ...(query.linkKey ? { linkKey: query.linkKey } : {}),
    ...(query.isAutomated !== undefined ? { isAutomated: query.isAutomated } : {}),
    limit: query.limit,
    offset: query.offset,
  });

  return {
    events: result.events,
    pagination: { limit: query.limit, offset: query.offset, returned: result.events.length, total: result.total, hasMore: query.offset + result.events.length < result.total },
    filters: {
      from: query.from ?? null,
      to: query.to ?? null,
      campaignId: query.campaignId ?? null,
      recipientRef: query.recipientRef ?? null,
      linkKey: query.linkKey ?? null,
      isAutomated: query.isAutomated ?? null,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function buildRecipientReport(campaignId: string, limit: number, offset: number) {
  return getCampaignRecipientReport(campaignId, limit, offset);
}

export async function buildLinkPerformance(campaignId?: string) {
  return getLinkPerformance(campaignId);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function buildRecipientCsv(campaignId: string) {
  const report = await getEventsForCsv(campaignId);
  const headers = [
    'campaign_id',
    'recipient_ref',
    'email',
    'link_key',
    'link_label',
    'destination_url',
    'total_clicks',
    'human_clicks',
    'automated_clicks',
    'status',
    'first_clicked_at',
    'last_clicked_at',
  ];
  const lines = [headers.map(csvCell).join(',')];

  for (const recipient of report.recipients) {
    if (recipient.links.length === 0) {
      lines.push([
        campaignId, recipient.recipientRef, recipient.email, '', '', '',
        recipient.totalClicks, recipient.humanClicks, recipient.automatedClicks,
        recipient.status, '', '',
      ].map(csvCell).join(','));
      continue;
    }

    for (const link of recipient.links) {
      lines.push([
        campaignId, recipient.recipientRef, recipient.email, link.key, link.label,
        link.destinationUrl, link.totalClicks, link.humanClicks, link.automatedClicks,
        link.status, link.firstClickedAt, link.lastClickedAt,
      ].map(csvCell).join(','));
    }
  }

  return lines.join('\r\n');
}
