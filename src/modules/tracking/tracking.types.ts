export type CreateCampaignInput = {
  slug: string;
  name: string;
};

export type CreateTrackingTokenInput = {
  campaignId?: string;
  redirectLinkId?: string;
  recipientRef: string;
  expiresInDays?: number;
};

export type BulkTrackingLinkInput = {
  campaignId: string;
  recipients: Array<{
    email: string;
    recipientRef?: string;
  }>;
  links: Array<{
    key: string;
    label: string;
    destinationUrl: string;
  }>;
  expiresInDays?: number;
};

export type RecordClickInput = {
  destinationKey: string;
  trackingToken?: string;
  campaignId?: string | null;
  redirectLinkId?: string | null;
  requestId: string;
  userAgent?: string | null;
  referrer?: string | null;
};
