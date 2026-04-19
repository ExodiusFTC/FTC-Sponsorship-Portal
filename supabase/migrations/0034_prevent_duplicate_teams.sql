-- Prevent duplicate team records per coach owner.
-- Existing duplicates (if any) are untouched; this guards future inserts.

CREATE OR REPLACE FUNCTION prevent_duplicate_team_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM teams
    WHERE owner_id = NEW.owner_id
  ) THEN
    RAISE EXCEPTION 'Only one team profile is allowed per owner account';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_team_owner_trigger ON teams;
CREATE TRIGGER prevent_duplicate_team_owner_trigger
  BEFORE INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_team_owner();
