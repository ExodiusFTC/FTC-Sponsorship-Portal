-- 0015_add_dispatch_statuses.sql

ALTER TYPE submission_status ADD VALUE 'opened';
ALTER TYPE submission_status ADD VALUE 'bounced';
ALTER TYPE submission_status ADD VALUE 'delivered';
