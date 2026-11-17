import type { Context } from 'hono';
import type { DestinationKey } from '../../config/destinations';
import { getFixedDestination, resolveRedirectSlug } from './redirect.service';
import { AppError } from '../../lib/errors/app-error';
import { ErrorCode } from '../../lib/errors/error-codes';
import { recordClick } from '../tracking/tracking.service';
import { logger } from '../../lib/logger';
import type { AppEnv } from '../../types/hono-env';

async function recordClickWithoutBlockingRedirect(
  c: Context<AppEnv>,
  destinationKey: DestinationKey,
  trackingToken: string | undefined,
  campaignId: string | null = null,
  redirectLinkId: string | null = null,
): Promise<void> {
  try {
    await recordClick({
      destinationKey,
      ...(trackingToken ? { trackingToken } : {}),
      campaignId,
      redirectLinkId,
      requestId: c.get('requestId'),
      userAgent: c.req.header('user-agent') ?? null,
      referrer: c.req.header('referer') ?? null,
    });
  } catch (error) {
    logger.error('Click tracking failed; redirect will continue', {
      requestId: c.get('requestId'),
      destinationKey,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
  }
}

export function fixedRedirectHandler(destinationKey: DestinationKey) {
  return async (c: Context<AppEnv>) => {
    const trackingToken = c.req.query('cid');
    const destination = getFixedDestination(destinationKey);

    await recordClickWithoutBlockingRedirect(c, destinationKey, trackingToken);
    c.header('Cache-Control', 'no-store');
    return c.redirect(destination.url, 302);
  };
}

export async function dynamicRedirectHandler(
  c: Context<AppEnv>,
) {
  const trackingToken = c.req.query('cid');
  const slug = c.req.param('slug');

  if (!slug) {
    throw new AppError('A redirect slug is required.', ErrorCode.VALIDATION_ERROR, 400);
  }

  const resolved = await resolveRedirectSlug(slug);

  await recordClickWithoutBlockingRedirect(
    c,
    resolved.destinationKey,
    trackingToken,
    resolved.campaignId,
    resolved.id,
  );

  c.header('Cache-Control', 'no-store');
  return c.redirect(resolved.destination.url, 302);
}
