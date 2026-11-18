import { randomBytes, randomUUID } from 'node:crypto';
import { getEnv } from '../../config/env.js';
import { AppError } from '../../lib/errors/app-error.js';
import { ErrorCode } from '../../lib/errors/error-codes.js';
import { generateOpaqueToken, hashOpaqueToken } from '../../lib/token.js';
import {
  findCampaignById,
  findCampaignBySlug,
  findCampaignRecordById,
  findCampaignRedirectLinkByKey,
  findRedirectLinkForToken,
  findUsableTokenByHash,
  insertBulkLinksAndTokens,
  insertCampaign,
  insertClickEvent,
  insertTrackingToken,
  listCampaignRecords,
  getCampaignCounts,
  revokeTrackingToken,
  updateTokenLastUsedAt,
} from './tracking.repository.js';
import type {
  BulkTrackingLinkInput,
  CreateCampaignInput,
  CreateTrackingTokenInput,
  RecordClickInput,
} from './tracking.types.js';

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

export async function listCampaigns() {
  return listCampaignRecords();
}

export async function getCampaignDetails(campaignId: string) {
  const campaign = await findCampaignRecordById(campaignId);
  if (!campaign) {
    throw new AppError('The specified campaign does not exist.', ErrorCode.NOT_FOUND, 404);
  }
  const counts = await getCampaignCounts(campaignId);
  return { ...campaign, counts };
}

export async function createTrackingToken(input: CreateTrackingTokenInput) {
  if (input.campaignId) {
    const campaign = await findCampaignById(input.campaignId);
    if (!campaign) {
      throw new AppError('The specified campaign does not exist.', ErrorCode.NOT_FOUND, 404);
    }
  }

  const linkedRedirect = input.redirectLinkId
    ? await findRedirectLinkForToken(input.redirectLinkId)
    : null;
  if (input.redirectLinkId && !linkedRedirect) {
    throw new AppError('The specified redirect link does not exist.', ErrorCode.NOT_FOUND, 404);
  }
  if (input.campaignId && linkedRedirect && linkedRedirect.campaignId !== input.campaignId) {
    throw new AppError('The redirect link belongs to a different campaign.', ErrorCode.CONFLICT, 409);
  }

  const token = generateOpaqueToken();
  const expiresInDays = input.expiresInDays ?? getEnv().TRACKING_TOKEN_TTL_DAYS;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const stored = await insertTrackingToken({
    tokenHash: hashOpaqueToken(token),
    campaignId: input.campaignId ?? linkedRedirect?.campaignId ?? null,
    redirectLinkId: input.redirectLinkId ?? null,
    recipientRef: input.recipientRef.trim(),
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

export async function createBulkTrackingLinks(input: BulkTrackingLinkInput) {
  const campaign = await findCampaignRecordById(input.campaignId);
  if (!campaign) {
    throw new AppError('The specified campaign does not exist.', ErrorCode.NOT_FOUND, 404);
  }

  const env = getEnv();
  const now = new Date();
  const expiresInDays = input.expiresInDays ?? env.TRACKING_TOKEN_TTL_DAYS;
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
  const baseUrl = env.PUBLIC_BASE_URL.replace(/\/+$/, '');

  const linkRows: Array<{
    id: string;
    slug: string;
    destinationKey: string;
    destinationUrl: string;
    linkKey: string;
    label: string;
    campaignId: string;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
  }> = [];
  const campaignLinkDefinitions: Array<(typeof linkRows)[number]> = [];

  for (const definition of input.links) {
    const existing = await findCampaignRedirectLinkByKey(campaign.id, definition.key);
    if (existing) {
      if (!existing.isActive || (existing.expiresAt && existing.expiresAt <= now)) {
        throw new AppError(`Campaign CTA '${definition.key}' already exists but is inactive or expired.`, ErrorCode.CONFLICT, 409);
      }
      if (existing.destinationUrl !== definition.destinationUrl) {
        throw new AppError(`Campaign CTA '${definition.key}' already points to a different URL. Use a new key or update the existing link first.`, ErrorCode.CONFLICT, 409);
      }
      if (existing.label !== definition.label) {
        throw new AppError(`Campaign CTA '${definition.key}' already has a different label. Keep the key/label consistent across batches.`, ErrorCode.CONFLICT, 409);
      }
      campaignLinkDefinitions.push({
        id: existing.id,
        slug: existing.slug,
        destinationKey: existing.destinationKey,
        destinationUrl: existing.destinationUrl ?? definition.destinationUrl,
        linkKey: existing.linkKey ?? definition.key,
        label: existing.label ?? definition.label,
        campaignId: existing.campaignId ?? campaign.id,
        isActive: existing.isActive,
        expiresAt: existing.expiresAt,
        createdAt: existing.createdAt,
      });
      continue;
    }

    const id = randomUUID();
    const campaignPrefix = campaign.slug.slice(0, 28).replace(/-+$/, '');
    const slugKey = definition.key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20).replace(/-+$/, '');
    const slug = `${campaignPrefix}-${slugKey}-${randomBytes(8).toString('hex')}`;
    const link = {
      id,
      slug,
      destinationKey: definition.key,
      destinationUrl: definition.destinationUrl,
      linkKey: definition.key,
      label: definition.label,
      campaignId: campaign.id,
      isActive: true,
      expiresAt: null,
      createdAt: now,
    };
    linkRows.push(link);
    campaignLinkDefinitions.push(link);
  }

  const linkByKey = new Map<string, (typeof campaignLinkDefinitions)[number]>();
  for (const link of campaignLinkDefinitions) linkByKey.set(link.linkKey, link);
  const tokenRows: Array<{
    id: string;
    tokenHash: string;
    campaignId: string;
    redirectLinkId: string;
    recipientRef: string;
    expiresAt: Date;
    createdAt: Date;
  }> = [];
  const rawResults: Array<{
    email: string;
    recipientRef: string;
    links: Record<string, { label: string; url: string }>;
  }> = [];

  for (const recipient of input.recipients) {
    const email = recipient.email.trim().toLowerCase();
    const recipientRef = recipient.recipientRef?.trim() || email;
    const resultLinks: Record<string, { label: string; url: string }> = {};

    for (const definition of input.links) {
      const link = linkByKey.get(definition.key);
      if (!link) continue;

      const token = generateOpaqueToken();
      tokenRows.push({
        id: randomUUID(),
        tokenHash: hashOpaqueToken(token),
        campaignId: campaign.id,
        redirectLinkId: link.id,
        recipientRef,
        expiresAt,
        createdAt: now,
      });

      const url = new URL(`/r/${link.slug}`, `${baseUrl}/`);
      url.searchParams.set('cid', token);
      resultLinks[definition.key] = { label: definition.label, url: url.toString() };
    }

    rawResults.push({ email, recipientRef, links: resultLinks });
  }

  try {
    await insertBulkLinksAndTokens(linkRows, tokenRows);
  } catch (error) {
    throw new AppError(
      'Bulk link generation failed. The database transaction was rolled back; no partial batch should remain.',
      ErrorCode.DATABASE_ERROR,
      500,
      error instanceof Error ? { cause: error.message } : undefined,
    );
  }

  return {
    campaign: { id: campaign.id, slug: campaign.slug, name: campaign.name },
    summary: {
      recipients: input.recipients.length,
      campaignLinksCreated: linkRows.length,
      campaignLinksUsed: campaignLinkDefinitions.length,
      trackingTokensCreated: tokenRows.length,
      personalizedLinksCreated: tokenRows.length,
      expiresAt: expiresAt.toISOString(),
    },
    campaignLinks: campaignLinkDefinitions.map((link) => ({
      key: link.linkKey,
      label: link.label,
      slug: link.slug,
      destinationUrl: link.destinationUrl,
      redirectPath: `/r/${link.slug}`,
    })),
    recipients: rawResults,
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
  const candidate = trackingToken
    ? await findUsableTokenByHash(hashOpaqueToken(trackingToken), now)
    : null;

  // Bulk-issued tokens are bound to one redirect-link CTA. A token copied to
  // another link is not attributed to that different CTA.
  const tokenRecord = candidate && (candidate.redirectLinkId === null || candidate.redirectLinkId === (input.redirectLinkId ?? null))
    ? candidate
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

export async function revokeToken(tokenId: string) {
  const revoked = await revokeTrackingToken(tokenId, new Date());
  if (!revoked) {
    throw new AppError('The token was not found or has already been revoked.', ErrorCode.NOT_FOUND, 404);
  }
  return revoked;
}
