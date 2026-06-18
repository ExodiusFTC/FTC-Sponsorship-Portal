-- 0015_add_dispatch_statuses.sql

ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'opened';
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'bounced';
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'delivered';
