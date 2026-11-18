# JSS Redirect API Guide

All protected endpoints require:

```http
Authorization: Bearer YOUR_INTERNAL_API_KEY
Content-Type: application/json
```

Do not place the internal API key in browser-side JavaScript, email templates, or public repositories.

## 1. Create a campaign

`POST /api/tracking/campaigns`

```json
{
  "slug": "promotional-email-nov-2026",
  "name": "Promotional Email"
}
```

Save the returned `id`. It is the `campaignId` used by the other campaign APIs.

## 2. Bulk-create CTA links and recipient tokens

`POST /api/tracking/bulk`

The request creates one reusable campaign redirect slug for each CTA and a different opaque tracking token for each recipient/CTA pair. The complete URL is unique for every recipient because its `cid` query parameter is unique.

```json
{
  "campaignId": "YOUR_CAMPAIGN_UUID",
  "expiresInDays": 30,
  "recipients": [
    { "email": "rahul@example.com" },
    { "email": "priya@example.com" }
  ],
  "links": [
    {
      "key": "website",
      "label": "Visit Website",
      "destinationUrl": "https://example.com"
    },
    {
      "key": "portfolio",
      "label": "View Portfolio",
      "destinationUrl": "https://github.com/example"
    }
  ]
}
```

If `recipientRef` is not provided, the normalized email address is stored as `recipient_ref`. An optional `recipientRef` can instead be supplied for an internal CRM/customer ID.

The response contains `recipients[]`; each recipient has a `links` object keyed by the CTA `key`. Use those personalized URLs as the corresponding email button destinations.

Batch limits: maximum 1,000 recipients, 10 CTA definitions, and 3,000 personalized recipient/CTA URLs per request. Larger jobs should be split into multiple requests. Each campaign CTA key must be unique in one request. Repeated batches for the same campaign reuse an existing CTA when its key, label, and destination URL match. A reused key with a different label/URL returns a conflict so the same campaign key cannot silently point to two destinations.

Destination URLs must be public-looking HTTPS URLs. HTTP, userinfo/credentials, IP-literal hosts, localhost, `.local`, and `.internal` hosts are rejected. This is a basic destination validation layer, not a substitute for an allowlist in a public multi-tenant product.

## 3. List and inspect campaigns

- `GET /api/tracking/campaigns`
- `GET /api/tracking/campaigns/:campaignId`

Campaign details include counts for unique recipients, campaign CTA links, tracking tokens, and click events.

## 4. Read analytics

- `GET /api/analytics/summary`
- `GET /api/analytics/events`
- `GET /api/analytics/recipients?campaignId=YOUR_CAMPAIGN_UUID`
- `GET /api/analytics/links?campaignId=YOUR_CAMPAIGN_UUID`
- `GET /api/analytics/export?campaignId=YOUR_CAMPAIGN_UUID`

Useful event filters:

```text
/api/analytics/events?campaignId=...&recipientRef=rahul@example.com
/api/analytics/events?campaignId=...&linkKey=website
/api/analytics/events?from=2026-11-18T00:00:00Z&to=2026-11-20T23:59:59Z
/api/analytics/events?isAutomated=false&limit=100&offset=0
```

The recipient report includes recipients for whom tracking tokens were generated, even when they have no click events. This is a generated-link recipient list, not proof of successful email delivery. Each recipient has per-CTA click counts, first/last click timestamps, automated-click counts, and a status. `no_recorded_human_click` means no event classified as non-automated was recorded. It does not prove the email was not opened or that the recipient did not see it.

The `isAutomated` flag is a user-agent heuristic. It can help identify known bot/scanner user agents but cannot reliably distinguish every human click from every security scanner.

The CSV export is one row per recipient/CTA assignment. It contains recipient references, CTA details, click counts, status, and timestamps. The export currently returns up to 10,000 recipients for a campaign per request.

## 5. Manage redirect links and tokens

- `GET /api/redirect-links?campaignId=...`
- `POST /api/redirect-links`
- `PATCH /api/redirect-links/:id`
- `DELETE /api/redirect-links/:id` (soft-deactivates the link)
- `POST /api/tracking/tokens/:tokenId/revoke`

A bulk-issued token is bound to its campaign CTA redirect link. Reusing that token with a different redirect slug will not attribute the click to the recipient.

## 6. Tracking URL behaviour

Bulk URLs have this form:

```text
https://jss-redirect.vercel.app/r/CAMPAIGN-CTA-SLUG?cid=OPAQUE_TOKEN
```

The `cid` token is returned only at creation time. Only its SHA-256 hash is stored in Turso. Keep the returned URLs private because they are bearer-style tracking links.

The redirect endpoint records a click event and returns an HTTP 302 response to the saved destination. Redirects are tracked as clicks, not email opens. Email delivery and email-open tracking are not implemented in this service.

## 7. Apply the database changes

The new schema changes are additive:

- `redirect_links.destination_url`
- `redirect_links.link_key`
- `redirect_links.label`
- `tracking_tokens.redirect_link_id`
- indexes for campaign CTA keys and token-to-link lookup

After uploading the source changes, run `npm run db:push` against the existing Turso database. `drizzle.config.ts` has `strict: false` so the command can run non-interactively in Colab. Alternatively, the equivalent SQL is in `drizzle/manual-migrations/0001_bulk_email_tracking.sql`; do not apply both methods if the columns already exist.

Set `PUBLIC_BASE_URL=https://jss-redirect.vercel.app` in Vercel and in the environment used for local/Colab testing. No secret `.env` file is included in this project archive.
