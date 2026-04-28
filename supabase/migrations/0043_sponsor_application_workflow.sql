-- 0043_sponsor_application_workflow.sql
-- Make sponsor_applications a real workflow table (status / approved_at /
-- approved_by). profiles.sponsor_id already exists (migration 0030).
-- Backfill: any existing sponsor_applications without status get 'pending'.

ALTER TABLE sponsor_applications
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sponsor_applications_status
  ON sponsor_applications(status);

-- profiles.sponsor_id may already be indexed; ensure it.
CREATE INDEX IF NOT EXISTS idx_profiles_sponsor_id
  ON profiles(sponsor_id) WHERE sponsor_id IS NOT NULL;
