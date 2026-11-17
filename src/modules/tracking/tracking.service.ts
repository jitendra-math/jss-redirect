import { getEnv } from '../../config/env';
import { AppError } from '../../lib/errors/app-error';
import { ErrorCode } from '../../lib/errors/error-codes';
import { generateOpaqueToken, hashOpaqueToken } from '../../lib/token';
import {
  findCampaignById,
  findCampaignBySlug,
  findUsableTokenByHash,
  insertCampaign,
  insertClickEvent,
  insertTrackingToken,
  updateTokenLastUsedAt,
} from './tracking.repository';
import type { CreateCampaignInput, CreateTrackingTokenInput, RecordClickInput } from './tracking.types';

export async function createCampaign(input: CreateCampaignInput) {
  const existing = await findCampaignBySlug(input.slug);

  if (existing) {
    if (existing.name !== input.name) {
      throw new AppError('A campaign with this slug already exists with a different name.', ErrorCode.CONFLICT, 409);
    }
    return existing;
  }

  try {
    const created = await insertCampaign(input);
    if (!created) {
      throw new AppError('The campaign could not be created.', ErrorCode.DATABASE_ERROR, 500);
    }
    return created;
  } catch (error) {
    const created = await findCampaignBySlug(input.slug);
    if (created) return created;
    throw error;
  }
}

export async function createTrackingToken(input: CreateTrackingTokenInput) {
  if (input.campaignId) {
    const campaign = await findCampaignById(input.campaignId);
    if (!campaign) {
      throw new AppError('The specified campaign does not exist.', ErrorCode.NOT_FOUND, 404);
    }
  }

  const token = generateOpaqueToken();
  const expiresInDays = input.expiresInDays ?? getEnv().TRACKING_TOKEN_TTL_DAYS;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const stored = await insertTrackingToken({
    tokenHash: hashOpaqueToken(token),
    campaignId: input.campaignId ?? null,
    recipientRef: input.recipientRef,
    expiresAt,
  });

  if (!stored) {
    throw new AppError('The tracking token could not be created.', ErrorCode.DATABASE_ERROR, 500);
  }

  return {
    token,
    id: stored.id,
    campaignId: stored.campaignId,
    recipientRef: stored.recipientRef,
    expiresAt: stored.expiresAt,
  };
}

function isLikelyAutomated(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;

  return /bot|crawler|spider|preview|fetcher|scanner|proofpoint|mimecast|barracuda|safelinks|googleimageproxy|urlscan|headlesschrome/i.test(userAgent);
}

function getReferrerOrigin(referrer: string | null | undefined): string | null {
  if (!referrer) return null;

  try {
    return new URL(referrer).origin.slice(0, 255);
  } catch {
    return null;
  }
}

export async function recordClick(input: RecordClickInput): Promise<void> {
  const now = new Date();
  const trackingToken = input.trackingToken;
  const tokenRecord = trackingToken
    ? await findUsableTokenByHash(hashOpaqueToken(trackingToken), now)
    : null;

  if (tokenRecord) {
    await updateTokenLastUsedAt(tokenRecord.id, now);
  }

  await insertClickEvent({
    destinationKey: input.destinationKey,
    campaignId: input.campaignId ?? tokenRecord?.campaignId ?? null,
    redirectLinkId: input.redirectLinkId ?? null,
    trackingTokenId: tokenRecord?.id ?? null,
    recipientRef: tokenRecord?.recipientRef ?? null,
    requestId: input.requestId,
    userAgent: input.userAgent?.slice(0, 500) ?? null,
    referrerOrigin: getReferrerOrigin(input.referrer),
    isAutomated: isLikelyAutomated(input.userAgent),
  });
}
