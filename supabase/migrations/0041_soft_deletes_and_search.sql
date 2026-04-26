-- =============================================================================
-- Migration: 0041_soft_deletes_and_search.sql
-- Purpose:   (1) Soft deletes on teams + submissions with RLS hardening.
--            (2) Full-text search vector on sponsors with GIN index.
-- =============================================================================

-- =============================================================================
-- PHASE 1: Soft Deletes
-- =============================================================================

-- 1a. Add deleted_at to teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 1b. Add deleted_at to submissions
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- -----------------------------------------------------------------------------
-- 1c. Update teams RLS policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "teams_select" ON teams;
DROP POLICY IF EXISTS "teams_update" ON teams;

-- Coaches see only their own non-deleted teams; admins see all non-deleted teams.
CREATE POLICY "teams_select" ON teams FOR SELECT
  USING ((owner_id = auth.uid() OR is_admin()) AND deleted_at IS NULL);

-- Coaches can update their own non-deleted teams; admins can update any team
-- (including soft-deleted ones, to allow restoration via deleted_at = NULL).
CREATE POLICY "teams_update" ON teams FOR UPDATE
  USING ((owner_id = auth.uid() AND deleted_at IS NULL) OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

-- -----------------------------------------------------------------------------
-- 1d. Update submissions RLS policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "submissions_select"         ON submissions;
DROP POLICY IF EXISTS "submissions_select_sponsor"  ON submissions;
DROP POLICY IF EXISTS "submissions_insert"          ON submissions;
DROP POLICY IF EXISTS "submissions_update_coach"    ON submissions;
DROP POLICY IF EXISTS "submissions_update_sponsor"  ON submissions;

-- Coaches see non-deleted submissions for their own teams; admins see all
-- non-deleted submissions.
CREATE POLICY "submissions_select" ON submissions FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id AND (t.owner_id = auth.uid() OR is_admin())
    )
  );

-- Sponsors see non-deleted submissions addressed to their company.
CREATE POLICY "submissions_select_sponsor" ON submissions FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'sponsor'
        AND profiles.sponsor_id = submissions.sponsor_id
    )
  );

-- Coaches can only create submissions for their own non-deleted teams.
CREATE POLICY "submissions_insert" ON submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id
        AND t.owner_id = auth.uid()
        AND t.deleted_at IS NULL
    )
    AND is_coach_verified()
  );

-- Coaches can edit non-deleted submissions that are still in editable states.
CREATE POLICY "submissions_update_coach" ON submissions FOR UPDATE
  USING (
    deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.owner_id = auth.uid())
    AND status IN ('draft', 'declined', 'changes_requested')
  )
  WITH CHECK (
    status IN ('draft', 'pending')
  );

-- Sponsors can act on non-deleted submissions addressed to their company.
-- Admin UPDATE policy is left without a deleted_at guard so admins can
-- restore soft-deleted submissions by setting deleted_at = NULL.
CREATE POLICY "submissions_update_sponsor" ON submissions FOR UPDATE
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'sponsor'
        AND profiles.sponsor_id = submissions.sponsor_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'sponsor'
        AND profiles.sponsor_id = submissions.sponsor_id
    )
  );

-- -----------------------------------------------------------------------------
-- 1e. Update prevent_duplicate_team_owner trigger to ignore soft-deleted teams.
--     Without this fix a coach whose team was soft-deleted could never create
--     a new one (the trigger would find the deleted row and reject the insert).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prevent_duplicate_team_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM teams
    WHERE owner_id = NEW.owner_id
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Only one team profile is allowed per owner account';
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1f. Rebuild the active-submission uniqueness index to exclude soft-deleted rows.
--     Without this, a soft-deleted submission would still block a new one for
--     the same (team, sponsor, season) combination.
-- -----------------------------------------------------------------------------

DROP INDEX IF EXISTS idx_single_active_submission_per_season;

CREATE UNIQUE INDEX idx_single_active_submission_per_season
  ON submissions (team_id, sponsor_id, season)
  WHERE status NOT IN ('declined', 'expired', 'bounced')
    AND deleted_at IS NULL;

COMMENT ON INDEX idx_single_active_submission_per_season IS
  'One active or approved submission per team-sponsor-season combo (excluding soft-deleted rows).';

-- =============================================================================
-- PHASE 2: Full-Text Search on sponsors
-- =============================================================================

-- 2a. Add search_vector column (populated by trigger below).
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2b. Function to compute the tsvector from the three searchable text columns.
--     Weights: company_name=A (highest), industry=B, notes=C (lowest).
CREATE OR REPLACE FUNCTION sponsors_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.company_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.industry,      '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.notes,         '')), 'C');
  RETURN NEW;
END;
$$;

-- 2c. Trigger: fires before every INSERT or UPDATE to keep search_vector current.
DROP TRIGGER IF EXISTS sponsors_search_vector_update ON sponsors;
CREATE TRIGGER sponsors_search_vector_update
  BEFORE INSERT OR UPDATE ON sponsors
  FOR EACH ROW EXECUTE FUNCTION sponsors_search_vector_update();

-- 2d. Backfill search_vector for all existing rows.
UPDATE sponsors
SET search_vector =
  setweight(to_tsvector('english', coalesce(company_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(industry,      '')), 'B') ||
  setweight(to_tsvector('english', coalesce(notes,         '')), 'C');

-- 2e. GIN index for fast full-text lookups.
CREATE INDEX IF NOT EXISTS idx_sponsors_search_vector
  ON sponsors USING GIN (search_vector);

-- =============================================================================
-- End of migration 0041_soft_deletes_and_search.sql
-- =============================================================================
