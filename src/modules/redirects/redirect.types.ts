export type CreateRedirectLinkInput = {
  slug: string;
  destinationKey: string;
  destinationUrl?: string;
  linkKey?: string;
  label?: string;
  campaignId?: string;
  expiresAt?: Date;
};
