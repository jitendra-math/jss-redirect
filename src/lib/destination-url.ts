import { isIP } from 'node:net';
import { z } from 'zod';

/**
 * Validate externally supplied redirect targets.
 * Redirect targets must be public-looking HTTPS URLs. IP literals and local
 * hostnames are rejected to reduce SSRF/open-redirect abuse.
 */
export function isAllowedDestinationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;

    const hostname = url.hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
    if (!hostname || isIP(hostname) !== 0) return false;
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) return false;
    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return false;
    if (!hostname.includes('.')) return false;

    // Non-standard HTTPS ports are not needed for campaign links.
    if (url.port && url.port !== '443') return false;
    return true;
  } catch {
    return false;
  }
}

export const destinationUrlSchema = z
  .url()
  .refine(isAllowedDestinationUrl, {
    message: 'Destination must be a public HTTPS URL without credentials or a private host.',
  });
