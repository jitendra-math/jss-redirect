import { getDestinations, isDestinationKey, type DestinationKey } from '../../config/destinations.js';
import { AppError } from '../../lib/errors/app-error.js';
import { ErrorCode } from '../../lib/errors/error-codes.js';
import {
  findActiveRedirectBySlug,
  findCampaignById,
  findCampaignRedirectLinkByKey,
  findRedirectBySlug,
  insertRedirectLink,
  listRedirectLinks,
  updateRedirectLink,
} from './redirect.repository.js';
import type { CreateRedirectLinkInput } from './redirect.types.js';

export function getFixedDestination(destinationKey: DestinationKey) {
  return getDestinations()[destinationKey];
}

export async function resolveRedirectSlug(slug: string) {
  const link = await findActiveRedirectBySlug(slug);

  if (!link) {
    throw new AppError('This redirect link was not found or is no longer active.', ErrorCode.NOT_FOUND, 404);
  }

  const destinationUrl = link.destinationUrl ?? (
    isDestinationKey(link.destinationKey) ? getDestinations()[link.destinationKey].url : null
  );

  if (!destinationUrl) {
    throw new AppError('The redirect destination is not configured.', ErrorCode.INTERNAL_ERROR, 500);
  }

  return {
    id: link.id,
    slug: link.slug,
    destinationKey: link.destinationKey,
    linkKey: link.linkKey,
    label: link.label,
    campaignId: link.campaignId,
    destination: { url: destinationUrl },
  };
}

export async function createRedirectLink(input: CreateRedirectLinkInput) {
  if (input.campaignId && !(await findCampaignById(input.campaignId))) {
    throw new AppError('The specified campaign does not exist.', ErrorCode.NOT_FOUND, 404);
  }

  const existing = await findRedirectBySlug(input.slug);
  if (existing) {
    throw new AppError('A redirect link with this slug already exists.', ErrorCode.CONFLICT, 409);
  }
  if (input.campaignId && input.linkKey && await findCampaignRedirectLinkByKey(input.campaignId, input.linkKey)) {
    throw new AppError('A redirect link with this key already exists in the campaign.', ErrorCode.CONFLICT, 409);
  }

  try {
    const created = await insertRedirectLink(input);
    if (!created) {
      throw new AppError('The redirect link could not be created.', ErrorCode.DATABASE_ERROR, 500);
    }
    return created;
  } catch (error) {
    const existingAfterInsert = await findRedirectBySlug(input.slug);
    if (existingAfterInsert) {
      throw new AppError('A redirect link with this slug already exists.', ErrorCode.CONFLICT, 409);
    }
    throw error;
  }
}

export async function getRedirectLinks(campaignId?: string) {
  return listRedirectLinks(campaignId);
}

export async function updateRedirectLinkById(id: string, patch: {
  destinationUrl?: string;
  label?: string | null;
  isActive?: boolean;
  expiresAt?: Date | null;
}) {
  const updated = await updateRedirectLink(id, patch);
  if (!updated) throw new AppError('The redirect link was not found.', ErrorCode.NOT_FOUND, 404);
  return updated;
}

export async function deactivateRedirectLink(id: string) {
  return updateRedirectLinkById(id, { isActive: false });
}
