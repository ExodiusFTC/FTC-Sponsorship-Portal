-- 0014_submission_tracking.sql

ALTER TABLE submissions
ADD COLUMN resend_message_id text;

CREATE INDEX idx_submissions_resend_message_id ON submissions(resend_message_id);
