-- Fix RED-005: RLS policy prevents logged-in Sponsors (authenticated role) from reading public team profiles
DROP POLICY IF EXISTS "Public portfolios are readable by anyone" ON teams;
CREATE POLICY "Public portfolios are readable by anyone"
  ON teams FOR SELECT
  TO public
  USING (public = true AND deleted_at IS NULL);
