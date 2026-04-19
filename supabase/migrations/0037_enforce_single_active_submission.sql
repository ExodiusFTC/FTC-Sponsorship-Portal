-- Migration: 0037_enforce_single_active_submission.sql
-- Goal: Enforce that a team can only have one "active" submission per sponsor per season.
-- "Active" is defined as any status that isn't terminal (declined, expired, bounced).

-- 1. Drop the overly permissive variant-based index if it exists.
-- This index allowed multiple submissions as long as they had different variant_labels.
DROP INDEX IF EXISTS idx_submissions_unique_variant;

-- 2. Ensure the original unique constraint from 0008 is also gone (just in case).
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_team_id_sponsor_id_key;

-- 3. Create a new partial unique index.
-- This ensures that for a given (team, sponsor, season), there can only be ONE 
-- submission that is NOT in a terminal state.
-- Terminal states: 'declined', 'expired', 'bounced'.
-- Note: 'approved' IS included in the uniqueness check to prevent multiple funded pitches 
-- to the same sponsor in a single season.
CREATE UNIQUE INDEX idx_single_active_submission_per_season
ON submissions (team_id, sponsor_id, season)
WHERE status NOT IN ('declined', 'expired', 'bounced');

-- 4. Add a comment for clarity
COMMENT ON INDEX idx_single_active_submission_per_season IS 'Enforces one active or approved submission per team-sponsor-season combo.';
