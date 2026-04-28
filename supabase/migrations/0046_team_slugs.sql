-- 0046_team_slugs.sql
-- Add a URL-safe slug to teams for the public /teams/[slug] portfolio page.
-- Also adds a `public` boolean to let coaches opt out of public visibility.

ALTER TABLE teams ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS public boolean NOT NULL DEFAULT true;

-- Backfill: derive slug from team_name (lowercase, non-alphanumeric → hyphens).
UPDATE teams
   SET slug = lower(regexp_replace(team_name, '[^a-zA-Z0-9]+', '-', 'g'))
 WHERE slug IS NULL;

-- Deduplicate any collisions from the backfill by appending the short team id.
UPDATE teams t
   SET slug = t.slug || '-' || substring(t.id::text, 1, 6)
 WHERE (
   SELECT count(*) FROM teams t2 WHERE t2.slug = t.slug
 ) > 1;

ALTER TABLE teams ALTER COLUMN slug SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teams_slug   ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_public ON teams(public) WHERE public = true;

-- RLS: public portfolios are readable by anyone (anon + authenticated).
-- The existing select policy covers authenticated; add anon explicitly.
CREATE POLICY IF NOT EXISTS "Public portfolios are readable by anyone"
  ON teams FOR SELECT
  TO anon
  USING (public = true AND deleted_at IS NULL);
