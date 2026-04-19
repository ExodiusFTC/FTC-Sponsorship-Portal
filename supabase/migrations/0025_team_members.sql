-- 0025_team_members.sql
-- Adds support for 'About the Team' section in the portfolio.
-- Stores coach photo URL and a list of team members (JSONB).

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS coach_photo_url text,
  ADD COLUMN IF NOT EXISTS team_members jsonb DEFAULT '[]'::jsonb;
