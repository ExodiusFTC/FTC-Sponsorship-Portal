-- 0027_update_submission_summary_view.sql
-- Updates v_submission_summary to include the season field and ensures all moderation fields are present.

DROP VIEW IF EXISTS v_submission_summary;
CREATE OR REPLACE VIEW v_submission_summary 
  WITH (security_invoker = true)
AS
SELECT 
  s.id, 
  t.team_name, 
  t.owner_id, 
  sp.company_name,
  s.status, 
  s.admin_feedback, 
  s.is_locked,
  s.season,
  t.financial_ask_cents, 
  s.created_at, 
  s.updated_at
FROM submissions s
JOIN teams t ON t.id = s.team_id
JOIN sponsors sp ON sp.id = s.sponsor_id;
