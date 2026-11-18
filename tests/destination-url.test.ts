import { describe, expect, it } from 'vitest';
import { isAllowedDestinationUrl } from '../src/lib/destination-url';

describe('destination URL validation', () => {
  it('accepts a public HTTPS destination', () => {
    expect(isAllowedDestinationUrl('https://example.com/path')).toBe(true);
  });

  it('rejects non-HTTPS URLs and credential-bearing URLs', () => {
    expect(isAllowedDestinationUrl('http://example.com')).toBe(false);
    expect(isAllowedDestinationUrl('https://user:pass@example.com')).toBe(false);
  });

  it('rejects local hostnames and IP-literal destinations', () => {
    expect(isAllowedDestinationUrl('https://localhost')).toBe(false);
    expect(isAllowedDestinationUrl('https://internal.local')).toBe(false);
    expect(isAllowedDestinationUrl('https://127.0.0.1')).toBe(false);
  });
});
