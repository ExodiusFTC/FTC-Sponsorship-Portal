-- 0053_remove_amount_required_guard.sql
-- Remove the "amount_required" guard from sponsor_decide_submission_atomic.
-- Sponsors no longer have budget caps. Approval works regardless of whether
-- reserved_amount_cents was set. Falls back to requested_amount_cents, then 0.

CREATE OR REPLACE FUNCTION sponsor_decide_submission_atomic(
  p_submission_id uuid,
  p_sponsor_user_id uuid,
  p_decision text,
  p_feedback text DEFAULT NULL,
  p_amount_cents bigint DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile    profiles%ROWTYPE;
  v_submission submissions%ROWTYPE;
  v_reserved   bigint;
  v_amount     bigint;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_sponsor_user_id;
  IF NOT FOUND OR v_profile.role <> 'sponsor' OR v_profile.sponsor_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_submission FROM submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'submission_not_found'); END IF;
  IF v_submission.sponsor_id <> v_profile.sponsor_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;
  IF v_submission.status NOT IN ('dispatched', 'delivered', 'opened') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  -- RELEASE paths (decline / send back for changes).
  IF p_decision IN ('declined', 'changes_requested') THEN
    PERFORM release_submission_reservation(
      p_submission_id,
      p_decision,
      CASE WHEN p_decision = 'declined' THEN 'sponsor_decline' ELSE 'sponsor_changes_requested' END
    );
    UPDATE submissions
       SET admin_feedback = NULLIF(p_feedback, ''), reviewed_by = p_sponsor_user_id
     WHERE id = p_submission_id;
    INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
    VALUES (p_sponsor_user_id,
            CASE WHEN p_decision = 'declined' THEN 'sponsor_decline_submission'
                 ELSE 'sponsor_request_changes_submission' END,
            'submissions', p_submission_id,
            jsonb_build_object('sponsor_id', v_profile.sponsor_id));
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF p_decision <> 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  -- Defense against double-settle.
  IF EXISTS (
    SELECT 1 FROM transactions_ledger tl
     WHERE tl.submission_id = p_submission_id AND tl.actor_type = 'sponsor'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_decided');
  END IF;

  -- Use reserved amount if set, otherwise fall back to the submission's requested amount.
  -- No longer block on zero — sponsors have no budget cap.
  v_reserved := COALESCE(v_submission.reserved_amount_cents, 0);
  v_amount   := CASE WHEN v_reserved > 0 THEN v_reserved
                     ELSE COALESCE(v_submission.requested_amount_cents, 0)
                END;

  UPDATE submissions
     SET status = 'approved',
         admin_feedback = NULLIF(p_feedback, ''),
         reviewed_by = p_sponsor_user_id,
         reviewed_at = now(),
         reserved_amount_cents = v_amount
   WHERE id = p_submission_id;

  -- Update sponsor's running total only if we have an amount to record.
  IF v_amount > 0 THEN
    UPDATE sponsors
       SET funding_used_cents = funding_used_cents + v_amount
     WHERE id = v_profile.sponsor_id;
  END IF;

  INSERT INTO transactions_ledger (sponsor_id, team_id, submission_id, amount_cents, decision_type, actor_type)
  VALUES (v_profile.sponsor_id, v_submission.team_id, p_submission_id, v_amount, 'full', 'sponsor');

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_sponsor_user_id, 'sponsor_approve_submission', 'submissions', p_submission_id,
          jsonb_build_object('sponsor_id', v_profile.sponsor_id, 'amount_cents', v_amount));

  RETURN jsonb_build_object('ok', true, 'amount_cents', v_amount);
END;
$$;
