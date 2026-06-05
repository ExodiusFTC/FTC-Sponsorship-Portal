-- 0047_reserve_at_approval.sql
-- =====================================================================================
-- Two-phase funding model: RESERVE at admin approval, SETTLE / RELEASE at the sponsor
-- decision. Fixes:
--   H-2  capacity over-commitment (approval now reserves against the cap)
--   C-1  Resend webhook clobbering funded status (release is guarded to live states only)
--   C-2  expiry cron corrupting funded rows / never expiring stale ones
--   L-1  cents standardized on bigint (no more 32-bit int overflow at ~$21.4M)
--
-- Funding lifecycle:
--   reserve  (approve_submission_atomic): funding_used_cents += ask;
--                                         submissions.reserved_amount_cents = ask;
--                                         status -> 'dispatched'
--   settle   (sponsor accept):            write transactions_ledger row; reservation kept
--                                         (full) or partially released (partial); status -> 'approved'
--   release  (decline / expire / bounce / changes_requested):
--                                         funding_used_cents -= reserved_amount_cents;
--                                         reservation zeroed; sponsor re-activated if below cap
--
-- Invariant: sponsors.funding_used_cents = (sum of open reservations) + (sum of settled fundings).
-- The transactions_ledger remains the append-only ground truth for *settled* funding only;
-- reservations are transient and tracked on the submission row + audit_log.
-- =====================================================================================

-- 1. Track the live reservation amount per submission. Defaults 0 so pre-existing rows
--    (created under the old debit-at-accept model, already counted in funding_used_cents)
--    are release no-ops and never double-refunded.
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS reserved_amount_cents bigint NOT NULL DEFAULT 0;

-- 2. RESERVE at admin approval. Capacity is committed now, so a popular sponsor can never
--    be dispatched beyond its cap. Mints the sponsor-view token in the same transaction.
CREATE OR REPLACE FUNCTION approve_submission_atomic(
  p_submission_id uuid,
  p_admin_id      uuid,
  p_amount_cents  bigint DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_submission  submissions%ROWTYPE;
  v_sponsor     sponsors%ROWTYPE;
  v_team        teams%ROWTYPE;
  v_ask_cents   bigint;
  v_token_plain text;
  v_token_hash  text;
  v_now     timestamptz := now();
  v_expires timestamptz := now() + interval '14 days';
BEGIN
  SELECT * INTO v_submission FROM submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'submission_not_found'); END IF;
  IF v_submission.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'submission_not_pending');
  END IF;

  SELECT * INTO v_sponsor FROM sponsors WHERE id = v_submission.sponsor_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'sponsor_not_found'); END IF;

  SELECT * INTO v_team FROM teams WHERE id = v_submission.team_id;
  v_ask_cents := CASE WHEN p_amount_cents > 0 THEN p_amount_cents
                      ELSE COALESCE(v_team.financial_ask_cents, 0) END;
  IF v_ask_cents <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;

  -- RESERVE: include all prior open reservations + settlements in the check.
  IF (v_sponsor.funding_used_cents + v_ask_cents) > v_sponsor.funding_cap_cents THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_sponsor_capacity');
  END IF;

  UPDATE submissions
     SET status = 'dispatched',
         reviewed_by = p_admin_id,
         reviewed_at = v_now,
         sent_at     = v_now,
         expires_at  = v_expires,
         requested_amount_cents = v_ask_cents,
         reserved_amount_cents  = v_ask_cents
   WHERE id = p_submission_id;

  UPDATE sponsors
     SET funding_used_cents = funding_used_cents + v_ask_cents,
         status = CASE WHEN funding_used_cents + v_ask_cents >= funding_cap_cents
                       THEN 'inactive'::sponsor_status ELSE status END
   WHERE id = v_sponsor.id;

  INSERT INTO audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_admin_id, 'approve_submission', 'submissions', p_submission_id,
          jsonb_build_object('amount_cents', v_ask_cents, 'sponsor_id', v_sponsor.id, 'phase', 'reserve'));

  v_token_plain := encode(gen_random_bytes(32), 'hex');
  v_token_hash  := encode(digest(v_token_plain, 'sha256'), 'hex');
  INSERT INTO submission_access_tokens(submission_id, token_hash, expires_at)
  VALUES (p_submission_id, v_token_hash, v_expires);

  RETURN jsonb_build_object('ok', true, 'token', v_token_plain, 'amount_cents', v_ask_cents);
END;
$$;

-- 3. RELEASE a live reservation and move the submission to a terminal/return state.
--    GUARDED: only acts on live awaiting-sponsor states. This is the structural fix that
--    stops a late Resend bounce (C-1) or the expiry cron (C-2) from ever clobbering a
--    settled ('approved') deal or re-releasing an already-terminal row.
CREATE OR REPLACE FUNCTION release_submission_reservation(
  p_submission_id uuid,
  p_new_status    text,        -- 'expired' | 'bounced' | 'declined' | 'changes_requested'
  p_reason        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_submission submissions%ROWTYPE;
  v_released   bigint;
BEGIN
  IF p_new_status NOT IN ('expired', 'bounced', 'declined', 'changes_requested') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  SELECT * INTO v_submission FROM submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'submission_not_found'); END IF;

  IF v_submission.status NOT IN ('dispatched', 'delivered', 'opened') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_releasable', 'current_status', v_submission.status);
  END IF;

  v_released := COALESCE(v_submission.reserved_amount_cents, 0);

  IF v_released > 0 THEN
    UPDATE sponsors
       SET funding_used_cents = GREATEST(funding_used_cents - v_released, 0),
           status = CASE WHEN status = 'inactive'
                          AND (funding_used_cents - v_released) < funding_cap_cents
                         THEN 'active'::sponsor_status ELSE status END
     WHERE id = v_submission.sponsor_id;
  END IF;

  UPDATE submissions
     SET status = p_new_status::submission_status,
         reserved_amount_cents = 0,
         reviewed_at = COALESCE(reviewed_at, now())
   WHERE id = p_submission_id;

  INSERT INTO audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (NULL, 'release_reservation', 'submissions', p_submission_id,
          jsonb_build_object('released_cents', v_released, 'new_status', p_new_status,
                             'reason', p_reason, 'sponsor_id', v_submission.sponsor_id));

  RETURN jsonb_build_object('ok', true, 'released_cents', v_released);
END;
$$;

-- 4. Batch expiry for the daily cron. Targets the awaiting-sponsor states (NOT 'approved')
--    and releases each reservation. Funded rows are therefore never expired.
CREATE OR REPLACE FUNCTION expire_overdue_submissions()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id    uuid;
  v_count int := 0;
BEGIN
  FOR v_id IN
    SELECT id FROM submissions
     WHERE status IN ('dispatched', 'delivered', 'opened')
       AND expires_at IS NOT NULL
       AND expires_at < now()
  LOOP
    PERFORM release_submission_reservation(v_id, 'expired', 'token_expired');
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'expired', v_count);
END;
$$;

-- 5. Sponsor decision via tokenized email link: SETTLE (full/partial) or RELEASE (decline).
--    Standardized on bigint (drop the old 32-bit int signature so no overload remains —
--    this also retires the dead 0028 definition, fixing L-1).
DROP FUNCTION IF EXISTS record_sponsor_decision_atomic(text, text, int);
CREATE OR REPLACE FUNCTION record_sponsor_decision_atomic(
  p_token_hash text,
  p_decision text,                          -- 'full' | 'partial' | 'decline'
  p_partial_amount_cents bigint DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_token_id      uuid;
  v_submission_id uuid;
  v_submission    submissions%ROWTYPE;
  v_reserved      bigint;
  v_amount        bigint;
  v_decision_type text;
BEGIN
  -- Atomically claim the token (single-use). Concurrent loser sees zero rows and bails.
  WITH claimed AS (
    UPDATE submission_access_tokens
       SET used_at = now()
     WHERE token_hash = p_token_hash
       AND used_at IS NULL
       AND revoked_at IS NULL
       AND expires_at > now()
     RETURNING id, submission_id
  )
  SELECT id, submission_id INTO v_token_id, v_submission_id FROM claimed;

  IF v_token_id IS NULL THEN
    PERFORM 1 FROM submission_access_tokens WHERE token_hash = p_token_hash;
    IF FOUND THEN RETURN json_build_object('ok', false, 'error', 'token_used'); END IF;
    RETURN json_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_submission FROM submissions WHERE id = v_submission_id FOR UPDATE;

  -- Only a live reservation can be acted on (also blocks acting after a portal settle).
  IF v_submission.status NOT IN ('dispatched', 'delivered', 'opened') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  v_reserved := COALESCE(v_submission.reserved_amount_cents, 0);

  IF p_decision = 'decline' THEN
    PERFORM release_submission_reservation(v_submission_id, 'declined', 'sponsor_decline');
    RETURN json_build_object('ok', true);
  END IF;

  -- SETTLE. Funds are already reserved, so we never debit again; clamp partial to the
  -- reserved amount (a sponsor cannot fund more than the reserved ask — fixes M-7).
  IF p_decision = 'partial' AND p_partial_amount_cents > 0 AND p_partial_amount_cents < v_reserved THEN
    v_amount := p_partial_amount_cents;
    v_decision_type := 'partial';
  ELSE
    v_amount := v_reserved;
    v_decision_type := 'full';
  END IF;

  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'amount_required';
  END IF;

  -- Release the unfunded difference on a partial settlement.
  IF v_amount < v_reserved THEN
    UPDATE sponsors
       SET funding_used_cents = GREATEST(funding_used_cents - (v_reserved - v_amount), 0),
           status = CASE WHEN status = 'inactive'
                          AND (funding_used_cents - (v_reserved - v_amount)) < funding_cap_cents
                         THEN 'active'::sponsor_status ELSE status END
     WHERE id = v_submission.sponsor_id;
  END IF;

  UPDATE submissions
     SET status = 'approved', reviewed_at = now(), reserved_amount_cents = v_amount
   WHERE id = v_submission_id;

  INSERT INTO transactions_ledger (sponsor_id, team_id, submission_id, amount_cents, decision_type, actor_type)
  VALUES (v_submission.sponsor_id, v_submission.team_id, v_submission_id, v_amount, v_decision_type, 'sponsor');

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (NULL, 'sponsor_accept', 'submissions', v_submission_id,
          jsonb_build_object('sponsor_id', v_submission.sponsor_id, 'amount_cents', v_amount, 'decision_type', v_decision_type));

  RETURN json_build_object('ok', true, 'amount_cents', v_amount);
END;
$$;

-- 6. Sponsor decision via authenticated portal: same SETTLE / RELEASE semantics.
CREATE OR REPLACE FUNCTION sponsor_decide_submission_atomic(
  p_submission_id uuid,
  p_sponsor_user_id uuid,
  p_decision text,                 -- 'approved' | 'declined' | 'changes_requested'
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
  v_decision_type text;
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

  v_reserved := COALESCE(v_submission.reserved_amount_cents, 0);

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

  -- Defense in depth against double-settle across the token + portal paths.
  IF EXISTS (
    SELECT 1 FROM transactions_ledger tl
     WHERE tl.submission_id = p_submission_id AND tl.actor_type = 'sponsor'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_decided');
  END IF;

  -- SETTLE (funds already reserved; clamp partial to the reserved ask).
  IF p_amount_cents > 0 AND p_amount_cents < v_reserved THEN
    v_amount := p_amount_cents;
    v_decision_type := 'partial';
  ELSE
    v_amount := v_reserved;
    v_decision_type := 'full';
  END IF;

  IF v_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'amount_required');
  END IF;

  IF v_amount < v_reserved THEN
    UPDATE sponsors
       SET funding_used_cents = GREATEST(funding_used_cents - (v_reserved - v_amount), 0),
           status = CASE WHEN status = 'inactive'
                          AND (funding_used_cents - (v_reserved - v_amount)) < funding_cap_cents
                         THEN 'active'::sponsor_status ELSE status END
     WHERE id = v_profile.sponsor_id;
  END IF;

  UPDATE submissions
     SET status = 'approved', admin_feedback = NULLIF(p_feedback, ''),
         reviewed_by = p_sponsor_user_id, reviewed_at = now(),
         reserved_amount_cents = v_amount
   WHERE id = p_submission_id;

  INSERT INTO transactions_ledger (sponsor_id, team_id, submission_id, amount_cents, decision_type, actor_type)
  VALUES (v_profile.sponsor_id, v_submission.team_id, p_submission_id, v_amount, v_decision_type, 'sponsor');

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_sponsor_user_id, 'sponsor_approve_submission', 'submissions', p_submission_id,
          jsonb_build_object('sponsor_id', v_profile.sponsor_id, 'amount_cents', v_amount));

  RETURN jsonb_build_object('ok', true, 'amount_cents', v_amount);
END;
$$;
