ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS season text;

-- Update submitted_at if status is already beyond draft
UPDATE submissions SET submitted_at = created_at WHERE status != 'draft' AND submitted_at IS NULL;

-- Set default season for existing submissions (e.g. 2024-25)
UPDATE submissions SET season = '2024-25' WHERE season IS NULL;
