-- Migration: 0038_update_submission_summary_with_sponsor_id.sql
-- Goal: Include sponsor_id in v_submission_summary so the coach dashboard can 
--       correctly identify which sponsors already have active pitches.

DROP VIEW IF EXISTS v_submission_summary;

CREATE OR REPLACE VIEW v_submission_summary 
  WITH (security_invoker = true)
AS
SELECT 
  s.id, 
  t.team_name, 
  t.owner_id, 
  s.sponsor_id, -- Added this field
  sp.company_name,
  s.status, 
  s.admin_feedback, 
  s.is_locked,
  s.season,
  s.requested_amount_cents, 
  s.created_at, 
  s.updated_at
FROM submissions s
JOIN teams t ON t.id = s.team_id
JOIN sponsors sp ON sp.id = s.sponsor_id;
