-- 0013_submission_moderation_fields.sql

ALTER TABLE submissions
ADD COLUMN admin_feedback text,
ADD COLUMN reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN reviewed_at timestamptz;
