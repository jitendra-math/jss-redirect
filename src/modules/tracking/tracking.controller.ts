import type { Context } from 'hono';
import {
  createBulkTrackingLinks,
  createCampaign,
  createTrackingToken,
  getCampaignDetails,
  listCampaigns,
  revokeToken,
} from './tracking.service.js';
import type {
  BulkTrackingLinkInput,
  CreateCampaignInput,
  CreateTrackingTokenInput,
} from './tracking.types.js';
import type { AppEnv } from '../../types/hono-env.js';

export async function createCampaignHandler(c: Context<AppEnv>) {
  const input = await c.req.json<CreateCampaignInput>();
  const campaign = await createCampaign(input);
  return c.json({ data: campaign, requestId: c.get('requestId') }, 201);
}

export async function listCampaignsHandler(c: Context<AppEnv>) {
  const campaigns = await listCampaigns();
  return c.json({ data: campaigns, count: campaigns.length, requestId: c.get('requestId') });
}

export async function getCampaignDetailsHandler(c: Context<AppEnv>) {
  const campaignId = c.req.param('campaignId');
  const campaign = await getCampaignDetails(campaignId);
  return c.json({ data: campaign, requestId: c.get('requestId') });
}

export async function createTrackingTokenHandler(c: Context<AppEnv>) {
  const input = await c.req.json<CreateTrackingTokenInput>();
  const trackingToken = await createTrackingToken(input);
  return c.json({ data: trackingToken, requestId: c.get('requestId') }, 201);
}

export async function createBulkTrackingLinksHandler(c: Context<AppEnv>) {
  const input = await c.req.json<BulkTrackingLinkInput>();
  const result = await createBulkTrackingLinks(input);
  return c.json({ data: result, requestId: c.get('requestId') }, 201);
}

export async function revokeTrackingTokenHandler(c: Context<AppEnv>) {
  const tokenId = c.req.param('tokenId');
  const result = await revokeToken(tokenId);
  return c.json({ data: result, requestId: c.get('requestId') });
}
