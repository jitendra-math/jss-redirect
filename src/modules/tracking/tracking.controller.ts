import type { Context } from 'hono';
import { createCampaign, createTrackingToken } from './tracking.service';
import type { CreateCampaignInput, CreateTrackingTokenInput } from './tracking.types';
import type { AppEnv } from '../../types/hono-env';

export async function createCampaignHandler(c: Context<AppEnv>) {
  const input = await c.req.json<CreateCampaignInput>();
  const campaign = await createCampaign(input);
  return c.json({ data: campaign, requestId: c.get('requestId') }, 201);
}

export async function createTrackingTokenHandler(c: Context<AppEnv>) {
  const input = await c.req.json<CreateTrackingTokenInput>();
  const trackingToken = await createTrackingToken(input);
  return c.json({ data: trackingToken, requestId: c.get('requestId') }, 201);
}
