import type { DestinationKey } from '../../config/destinations.js';

export type CreateRedirectLinkInput = {
  slug: string;
  destinationKey: DestinationKey;
  campaignId?: string;
  expiresAt?: Date;
};

export type ResolvedRedirect = {
  id: string;
  slug: string;
  destinationKey: DestinationKey;
  campaignId: string | null;
};
