-- 0042_sponsor_decision_token_lock.sql
-- Close double-spend race in sponsor decision flow.
--
-- Problem (pre-fix): record_sponsor_decision_atomic SELECTed the token row
-- without FOR UPDATE and only marked used_at = now() at the END of the
-- function. Under READ COMMITTED isolation, two concurrent calls with the
-- same token both passed the v_used_at IS NULL guard, both queued on the
-- sponsor FOR UPDATE lock, and both succeeded — debiting the sponsor twice.
--
-- Fix: claim the token in a single UPDATE statement with WHERE used_at IS NULL.
-- Postgres serializes the row update; the loser sees zero rows and bails.
-- Plus a unique partial index on transactions_ledger as a second line of defense.

-- Defense-in-depth: only one sponsor-actor ledger row per submission.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_one_sponsor_decision
  ON transactions_ledger (submission_id)
  WHERE actor_type = 'sponsor';

CREATE OR REPLACE FUNCTION record_sponsor_decision_atomic(
  p_token_hash text,
  p_decision text,                          -- 'full' | 'partial' | 'decline'
  p_partial_amount_cents int DEFAULT 0
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_id      uuid;
  v_submission_id uuid;
  v_sponsor_id    uuid;
  v_team_id       uuid;
  v_ask_cents     int;
  v_used_cents    int;
  v_cap_cents     int;
  v_amount_cents  int;
  v_new_used      int;
BEGIN
  -- 1) ATOMICALLY claim the token. Single UPDATE marks used_at AND returns
  --    identity. If the row is already used / expired / revoked / absent,
  --    no row is updated and we bail.
  WITH claimed AS (
    UPDATE submission_access_tokens
       SET used_at = now()
     WHERE token_hash = p_token_hash
       AND used_at  IS NULL
       AND revoked_at IS NULL
       AND expires_at > now()
     RETURNING id, submission_id
  )
  SELECT id, submission_id INTO v_token_id, v_submission_id FROM claimed;

  IF v_token_id IS NULL THEN
    -- Distinguish "already used" from "invalid" by re-reading without locking.
    PERFORM 1 FROM submission_access_tokens WHERE token_hash = p_token_hash;
    IF FOUND THEN
      RETURN json_build_object('ok', false, 'error', 'token_used');
    END IF;
    RETURN json_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT sponsor_id, team_id INTO v_sponsor_id, v_team_id
    FROM submissions WHERE id = v_submission_id;

  IF p_decision = 'decline' THEN
    UPDATE submissions SET status = 'declined', reviewed_at = now()
     WHERE id = v_submission_id;
    INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
    VALUES (NULL, 'sponsor_decline', 'submissions', v_submission_id,
            jsonb_build_object('sponsor_id', v_sponsor_id));
    RETURN json_build_object('ok', true);
  END IF;

  -- Lock sponsor row for capacity math.
  SELECT funding_used_cents, funding_cap_cents
    INTO v_used_cents, v_cap_cents
    FROM sponsors WHERE id = v_sponsor_id FOR UPDATE;

  SELECT financial_ask_cents INTO v_ask_cents FROM teams WHERE id = v_team_id;

  v_amount_cents := CASE
    WHEN p_decision = 'partial' AND p_partial_amount_cents > 0 THEN p_partial_amount_cents
    ELSE v_ask_cents
  END;

  IF v_amount_cents <= 0 THEN
    -- Raise to roll back the token claim (transaction auto-rollback).
    RAISE EXCEPTION 'amount_required';
  END IF;

  IF v_used_cents + v_amount_cents > v_cap_cents THEN
    RAISE EXCEPTION 'insufficient_capacity';
  END IF;

  UPDATE submissions SET status = 'approved', reviewed_at = now()
   WHERE id = v_submission_id;

  v_new_used := v_used_cents + v_amount_cents;
  UPDATE sponsors
     SET funding_used_cents = v_new_used,
         status = CASE WHEN v_new_used >= funding_cap_cents
                       THEN 'inactive'::sponsor_status ELSE status END
   WHERE id = v_sponsor_id;

  INSERT INTO transactions_ledger (sponsor_id, team_id, submission_id, amount_cents, decision_type, actor_type)
  VALUES (v_sponsor_id, v_team_id, v_submission_id, v_amount_cents, p_decision, 'sponsor');

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (NULL, 'sponsor_accept', 'submissions', v_submission_id,
          jsonb_build_object('sponsor_id', v_sponsor_id,
                             'amount_cents', v_amount_cents,
                             'decision_type', p_decision));

  RETURN json_build_object('ok', true, 'amount_cents', v_amount_cents);
EXCEPTION
  WHEN OTHERS THEN
    RAISE; -- transaction rolls back; token reverts to unused
END;
$$;
