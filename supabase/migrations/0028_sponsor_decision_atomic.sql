-- 0028_sponsor_decision_atomic.sql
-- Atomic RPC for recording sponsor decisions to prevent race conditions on budget caps.

CREATE OR REPLACE FUNCTION record_sponsor_decision_atomic(
  p_token_hash text,
  p_decision text, -- 'full', 'partial', 'decline'
  p_partial_amount_cents int DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_id uuid;
  v_submission_id uuid;
  v_sponsor_id uuid;
  v_team_id uuid;
  v_expires_at timestamptz;
  v_used_at timestamptz;
  v_ask_cents int;
  v_used_cents int;
  v_cap_cents int;
  v_amount_cents int;
  v_new_used int;
BEGIN
  -- 1. Resolve and check token
  SELECT id, submission_id, expires_at, used_at
  INTO v_token_id, v_submission_id, v_expires_at, v_used_at
  FROM submission_access_tokens
  WHERE token_hash = p_token_hash;

  IF v_token_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  IF v_expires_at < now() THEN
    RETURN json_build_object('ok', false, 'error', 'token_expired');
  END IF;

  IF v_used_at IS NOT NULL THEN
    RETURN json_build_object('ok', false, 'error', 'token_used');
  END IF;

  -- 2. Resolve submission/sponsor/team context
  SELECT sponsor_id, team_id
  INTO v_sponsor_id, v_team_id
  FROM submissions
  WHERE id = v_submission_id;

  -- 3. Handle Decline
  IF p_decision = 'decline' THEN
    UPDATE submissions
    SET status = 'declined', reviewed_at = now()
    WHERE id = v_submission_id;

    INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
    VALUES (NULL, 'sponsor_decline', 'submissions', v_submission_id, jsonb_build_object('sponsor_id', v_sponsor_id));

    UPDATE submission_access_tokens
    SET used_at = now()
    WHERE id = v_token_id;

    RETURN json_build_object('ok', true);
  END IF;

  -- 4. Handle Acceptance (Full or Partial)
  -- LOCK the sponsor row to prevent race conditions on funding_used_cents
  SELECT funding_used_cents, funding_cap_cents
  INTO v_used_cents, v_cap_cents
  FROM sponsors
  WHERE id = v_sponsor_id
  FOR UPDATE;

  SELECT financial_ask_cents
  INTO v_ask_cents
  FROM teams
  WHERE id = v_team_id;

  IF p_decision = 'partial' AND p_partial_amount_cents > 0 THEN
    v_amount_cents := p_partial_amount_cents;
  ELSE
    v_amount_cents := v_ask_cents;
  END IF;

  IF v_used_cents + v_amount_cents > v_cap_cents THEN
    RETURN json_build_object('ok', false, 'error', 'insufficient_capacity');
  END IF;

  -- Atomic Writes
  UPDATE submissions
  SET status = 'approved', reviewed_at = now()
  WHERE id = v_submission_id;

  v_new_used := v_used_cents + v_amount_cents;
  UPDATE sponsors
  SET 
    funding_used_cents = v_new_used,
    status = CASE WHEN v_new_used >= funding_cap_cents THEN 'inactive'::sponsor_status ELSE status END
  WHERE id = v_sponsor_id;

  INSERT INTO transactions_ledger (sponsor_id, team_id, submission_id, amount_cents, decision_type, actor_type)
  VALUES (v_sponsor_id, v_team_id, v_submission_id, v_amount_cents, p_decision, 'sponsor');

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (NULL, 'sponsor_accept', 'submissions', v_submission_id, 
    jsonb_build_object('sponsor_id', v_sponsor_id, 'amount_cents', v_amount_cents, 'decision_type', p_decision));

  UPDATE submission_access_tokens
  SET used_at = now()
  WHERE id = v_token_id;

  RETURN json_build_object('ok', true, 'amount_cents', v_amount_cents);
END;
$$;
