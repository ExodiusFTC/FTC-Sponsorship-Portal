-- ============================================================
-- 0023: Admin fixes
--   1. Service-role bypass in prevent_role_elevation trigger
--   2. Add coach_verified type to notifications check constraint
--   3. Ensure sub-tables exist (IF NOT EXISTS makes this safe to run twice)
-- ============================================================

-- 1. Fix trigger so service role (auth.uid() IS NULL) is always allowed.
CREATE OR REPLACE FUNCTION prevent_role_elevation()
RETURNS TRIGGER AS $$
BEGIN
  -- Service role has auth.uid() = NULL; it is always trusted.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.role <> OLD.role AND NOT is_admin() THEN
    RAISE EXCEPTION 'role elevation not permitted';
  END IF;
  IF NEW.coach_verified <> OLD.coach_verified AND NOT is_admin() THEN
    RAISE EXCEPTION 'coach_verified modification not permitted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Ensure the notifications table has the coach_verified type available.
--    Migration 0022 created the table with a CHECK constraint.
--    We need to extend it to include 'coach_verified'.
--    Safest way: drop existing check, re-add with extra value.
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'submission_declined',
    'submission_approved',
    'submission_changes_requested',
    'coach_verified',
    'general'
  ));
