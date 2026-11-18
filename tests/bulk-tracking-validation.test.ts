import { describe, expect, it } from 'vitest';
import { bulkTrackingLinksSchema } from '../src/modules/tracking/tracking.validation';

describe('bulk tracking request validation', () => {
  const validRequest = {
    campaignId: '5be08df4-10ff-486a-993b-403365779279',
    recipients: [
      { email: 'Rahul@example.com' },
      { email: 'priya@example.com' },
    ],
    links: [
      { key: 'website', label: 'Visit Website', destinationUrl: 'https://example.com' },
      { key: 'portfolio', label: 'View Portfolio', destinationUrl: 'https://github.com/example' },
    ],
    expiresInDays: 30,
  };

  it('accepts recipient emails and multiple CTA destinations', () => {
    const parsed = bulkTrackingLinksSchema.safeParse(validRequest);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.recipients[0]?.email).toBe('rahul@example.com');
      expect(parsed.data.recipients).toHaveLength(2);
      expect(parsed.data.links).toHaveLength(2);
    }
  });

  it('rejects duplicate CTA keys and duplicate recipient emails', () => {
    const duplicated = {
      ...validRequest,
      recipients: [{ email: 'rahul@example.com' }, { email: 'RAHUL@example.com' }],
      links: [
        { key: 'website', label: 'Visit Website', destinationUrl: 'https://example.com' },
        { key: 'website', label: 'Portfolio', destinationUrl: 'https://github.com/example' },
      ],
    };
    expect(bulkTrackingLinksSchema.safeParse(duplicated).success).toBe(false);
  });
});
