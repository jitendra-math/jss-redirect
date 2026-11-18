-- Additive schema changes for bulk campaign links and recipient/CTA attribution.
-- Preferred: run `npm run db:push` after deploying these source changes.
-- Use this SQL only when applying the same changes manually in the Turso SQL console.

ALTER TABLE redirect_links ADD COLUMN destination_url TEXT;
ALTER TABLE redirect_links ADD COLUMN link_key TEXT;
ALTER TABLE redirect_links ADD COLUMN label TEXT;
ALTER TABLE tracking_tokens ADD COLUMN redirect_link_id TEXT REFERENCES redirect_links(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS redirect_links_campaign_link_key_unique_idx
  ON redirect_links (campaign_id, link_key);
CREATE INDEX IF NOT EXISTS tracking_tokens_redirect_link_idx
  ON tracking_tokens (redirect_link_id);
