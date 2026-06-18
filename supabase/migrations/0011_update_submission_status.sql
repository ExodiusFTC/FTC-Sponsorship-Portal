-- 0011_update_submission_status.sql

ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'changes_requested';
