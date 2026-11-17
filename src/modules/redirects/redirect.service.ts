import { getDestinations, isDestinationKey, type DestinationKey } from '../../config/destinations';
import { AppError } from '../../lib/errors/app-error';
import { ErrorCode } from '../../lib/errors/error-codes';
import { findActiveRedirectBySlug, findCampaignById, findRedirectBySlug, insertRedirectLink } from './redirect.repository';
import type { CreateRedirectLinkInput } from './redirect.types';

export function getFixedDestination(destinationKey: DestinationKey) {
  return getDestinations()[destinationKey];
}

export async function resolveRedirectSlug(slug: string) {
  const link = await findActiveRedirectBySlug(slug);

  if (!link) {
    throw new AppError('This redirect link was not found or is no longer active.', ErrorCode.NOT_FOUND, 404);
  }

  if (!isDestinationKey(link.destinationKey)) {
    throw new AppError('The redirect destination is not configured.', ErrorCode.INTERNAL_ERROR, 500);
  }

  return {
    id: link.id,
    slug: link.slug,
    destinationKey: link.destinationKey,
    campaignId: link.campaignId,
    destination: getDestinations()[link.destinationKey],
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
