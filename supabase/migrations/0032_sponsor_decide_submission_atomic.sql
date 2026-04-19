-- Atomic sponsor decision path for authenticated sponsor accounts.
-- Keeps submission status changes and budget reservation consistent under concurrency.

CREATE OR REPLACE FUNCTION sponsor_decide_submission_atomic(
  p_submission_id uuid,
  p_sponsor_user_id uuid,
  p_decision text, -- 'approved' | 'declined' | 'changes_requested'
  p_feedback text DEFAULT NULL,
  p_amount_cents bigint DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_submission submissions%ROWTYPE;
  v_sponsor sponsors%ROWTYPE;
  v_team teams%ROWTYPE;
  v_amount bigint;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_sponsor_user_id;

  IF NOT FOUND OR v_profile.role <> 'sponsor' OR v_profile.sponsor_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_submission
  FROM submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'submission_not_found');
  END IF;

  IF v_submission.sponsor_id <> v_profile.sponsor_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  IF v_submission.status IN ('declined', 'expired') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  IF p_decision = 'declined' OR p_decision = 'changes_requested' THEN
    UPDATE submissions
    SET
      status = p_decision::submission_status,
      admin_feedback = NULLIF(p_feedback, ''),
      reviewed_by = p_sponsor_user_id,
      reviewed_at = now()
    WHERE id = p_submission_id;

    INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
    VALUES (
      p_sponsor_user_id,
      CASE WHEN p_decision = 'declined' THEN 'sponsor_decline_submission' ELSE 'sponsor_request_changes_submission' END,
      'submissions',
      p_submission_id,
      jsonb_build_object('sponsor_id', v_profile.sponsor_id)
    );

    RETURN jsonb_build_object('ok', true);
  END IF;

  IF p_decision <> 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM transactions_ledger tl
    WHERE tl.submission_id = p_submission_id
      AND tl.actor_type = 'sponsor'
      AND tl.decision_type IN ('full', 'partial')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_decided');
  END IF;

  SELECT * INTO v_sponsor
  FROM sponsors
  WHERE id = v_profile.sponsor_id
  FOR UPDATE;

  SELECT * INTO v_team
  FROM teams
  WHERE id = v_submission.team_id;

  v_amount := CASE WHEN p_amount_cents > 0 THEN p_amount_cents ELSE v_team.financial_ask_cents END;

  IF v_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'amount_required');
  END IF;

  IF v_sponsor.funding_used_cents + v_amount > v_sponsor.funding_cap_cents THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_capacity');
  END IF;

  UPDATE submissions
  SET
    status = 'approved',
    admin_feedback = NULLIF(p_feedback, ''),
    reviewed_by = p_sponsor_user_id,
    reviewed_at = now()
  WHERE id = p_submission_id;

  UPDATE sponsors
  SET
    funding_used_cents = funding_used_cents + v_amount,
    status = CASE
      WHEN funding_used_cents + v_amount >= funding_cap_cents THEN 'inactive'::sponsor_status
      ELSE status
    END
  WHERE id = v_profile.sponsor_id;

  INSERT INTO transactions_ledger (sponsor_id, team_id, submission_id, amount_cents, decision_type, actor_type)
  VALUES (
    v_profile.sponsor_id,
    v_submission.team_id,
    p_submission_id,
    v_amount,
    CASE WHEN v_amount < v_team.financial_ask_cents THEN 'partial' ELSE 'full' END,
    'sponsor'
  );

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_sponsor_user_id,
    'sponsor_approve_submission',
    'submissions',
    p_submission_id,
    jsonb_build_object('sponsor_id', v_profile.sponsor_id, 'amount_cents', v_amount)
  );

  RETURN jsonb_build_object('ok', true, 'amount_cents', v_amount);
END;
$$;
