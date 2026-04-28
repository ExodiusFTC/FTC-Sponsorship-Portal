-- 0044_approve_submission_consolidate.sql
-- Consolidate sent_at and expires_at into approve_submission_atomic so the
-- caller no longer needs a follow-up UPDATE (which was a non-atomic step
-- that could leave sent_at NULL after a crash). Also adds the admin
-- terminal-decision RPC used by declineSubmission and requestEdit.
--
-- Single source of truth for the dispatch window: 14 days.

CREATE OR REPLACE FUNCTION approve_submission_atomic(
  p_submission_id  uuid,
  p_admin_id       uuid,
  p_amount_cents   bigint DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission    submissions%ROWTYPE;
  v_sponsor       sponsors%ROWTYPE;
  v_team          teams%ROWTYPE;
  v_ask_cents     bigint;
  v_token_plain   text;
  v_token_hash    text;
  v_now           timestamptz := now();
  v_expires       timestamptz := now() + interval '14 days';
BEGIN
  SELECT * INTO v_submission FROM submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'submission_not_found');
  END IF;

  IF v_submission.status NOT IN ('pending') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'submission_not_pending');
  END IF;

  SELECT * INTO v_sponsor FROM sponsors WHERE id = v_submission.sponsor_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sponsor_not_found');
  END IF;

  SELECT * INTO v_team FROM teams WHERE id = v_submission.team_id;
  v_ask_cents := CASE WHEN p_amount_cents > 0 THEN p_amount_cents ELSE v_team.financial_ask_cents END;

  IF (v_sponsor.funding_used_cents + v_ask_cents) > v_sponsor.funding_cap_cents THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_sponsor_capacity');
  END IF;

  -- Single UPDATE sets every dispatch-related column atomically.
  UPDATE submissions
  SET
    status = 'dispatched',
    reviewed_by = p_admin_id,
    reviewed_at = v_now,
    sent_at     = v_now,
    expires_at  = v_expires,
    requested_amount_cents = v_ask_cents
  WHERE id = p_submission_id;

  INSERT INTO audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_admin_id,
    'approve_submission',
    'submissions',
    p_submission_id,
    jsonb_build_object('amount_cents', v_ask_cents, 'sponsor_id', v_sponsor.id)
  );

  v_token_plain := encode(gen_random_bytes(32), 'hex');
  v_token_hash  := encode(digest(v_token_plain, 'sha256'), 'hex');

  INSERT INTO submission_access_tokens(submission_id, token_hash, expires_at)
  VALUES (p_submission_id, v_token_hash, v_expires);

  RETURN jsonb_build_object('ok', true, 'token', v_token_plain, 'amount_cents', v_ask_cents);
END;
$$;

-- Atomic admin terminal decisions (decline / changes_requested) so the
-- pending-only invariant cannot be violated by a concurrent state flip.
CREATE OR REPLACE FUNCTION admin_terminal_decision_atomic(
  p_submission_id uuid,
  p_admin_id      uuid,
  p_new_status    text,                  -- 'declined' | 'changes_requested'
  p_feedback      text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sub submissions%ROWTYPE;
BEGIN
  IF p_new_status NOT IN ('declined', 'changes_requested') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status');
  END IF;
  SELECT * INTO v_sub FROM submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'submission_not_found'); END IF;
  IF v_sub.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'submission_not_pending');
  END IF;

  UPDATE submissions
     SET status = p_new_status::submission_status,
         admin_feedback = NULLIF(p_feedback, ''),
         reviewed_by = p_admin_id,
         reviewed_at = now()
   WHERE id = p_submission_id;

  INSERT INTO audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_admin_id,
          CASE WHEN p_new_status = 'declined' THEN 'decline_submission'
               ELSE 'request_edit_submission' END,
          'submissions', p_submission_id,
          jsonb_build_object('feedback', p_feedback));

  RETURN jsonb_build_object('ok', true);
END $$;
