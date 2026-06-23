-- =============================================================================
-- Migration: 0051_clerk_auth.sql
-- Purpose:   Migrate authentication from Supabase Auth to Clerk while keeping
--            Supabase Postgres + Storage. RLS is now driven by the Clerk session
--            token (Supabase native third-party-auth): the Clerk user id arrives
--            as `auth.jwt() ->> 'sub'` (a TEXT like 'user_2abc...'), and
--            `auth.uid()` is NULL under Clerk.
--
-- Strategy (least-invasive):
--   * Keep profiles.id (uuid) PK and every existing FK unchanged.
--   * Add profiles.clerk_user_id (text) to map a Clerk id -> internal profile.
--   * Add current_profile_id() to resolve the Clerk sub -> profiles.id (uuid).
--   * Redefine is_admin()/is_coach_verified() to key off clerk_user_id, so every
--     policy that only calls those functions updates automatically.
--   * DROP+CREATE only the policies that referenced auth.uid() DIRECTLY.
--   * Storage paths now partition by the Clerk user id (text); rewrite the
--     folder-scoped storage policies accordingly.
--   * Drop the Supabase auth.users signup trigger (profiles are created by the
--     app / Clerk webhook now).
--
-- Idempotent: column add is IF NOT EXISTS; functions use CREATE OR REPLACE;
-- policies are DROP ... IF EXISTS then CREATE.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Identity bridge column
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clerk_user_id text UNIQUE;

COMMENT ON COLUMN profiles.clerk_user_id IS
  'Clerk user id (e.g. user_2abc...). Matches the JWT ''sub'' claim. Source of truth for auth identity; profiles.id remains the internal PK used by all FKs.';

CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON profiles(clerk_user_id);

-- ---------------------------------------------------------------------------
-- 2. Auth helper functions (Clerk-aware)
--    current_profile_id() resolves the Clerk sub -> internal profile uuid.
--    SECURITY DEFINER so they read profiles without tripping RLS (no recursion).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS uuid AS $$
  SELECT id FROM public.profiles
  WHERE clerk_user_id = (auth.jwt() ->> 'sub')
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_coach_verified()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')
      AND role = 'coach' AND coach_verified = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- prevent_role_elevation: trusted/service-role contexts carry no Clerk sub.
CREATE OR REPLACE FUNCTION prevent_role_elevation()
RETURNS TRIGGER AS $$
BEGIN
  -- Service role / trusted server context has no Clerk 'sub'; always allow.
  IF (auth.jwt() ->> 'sub') IS NULL THEN
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

-- ---------------------------------------------------------------------------
-- 3. Remove the Supabase Auth signup trigger.
--    Profiles are now created by the app (createCoachProfile / createSponsor*)
--    and reconciled by the Clerk webhook. auth.users is no longer written by us.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Rewrite policies that referenced auth.uid() DIRECTLY.
--    (Policies that only call is_admin()/is_coach_verified() are already
--     correct via the function redefinitions above and are left untouched.)
-- ---------------------------------------------------------------------------

-- ── profiles ────────────────────────────────────────────────────────────────
-- "this row is mine" => the row's clerk_user_id matches my token's sub.
DROP POLICY IF EXISTS "profiles_select"         ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (clerk_user_id = (auth.jwt() ->> 'sub') OR is_admin());

DROP POLICY IF EXISTS "profiles_update_own"     ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (clerk_user_id = (auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "profiles_insert_trigger" ON profiles;
CREATE POLICY "profiles_insert_trigger" ON profiles FOR INSERT
  WITH CHECK (clerk_user_id = (auth.jwt() ->> 'sub') AND role = 'coach');
-- (profiles_update_admin uses only is_admin() — unchanged.)

-- ── teams ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "teams_select" ON teams;
CREATE POLICY "teams_select" ON teams FOR SELECT
  USING ((owner_id = current_profile_id() OR is_admin()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "teams_insert" ON teams;
CREATE POLICY "teams_insert" ON teams FOR INSERT
  WITH CHECK (owner_id = current_profile_id() AND is_coach_verified());

DROP POLICY IF EXISTS "teams_update" ON teams;
CREATE POLICY "teams_update" ON teams FOR UPDATE
  USING ((owner_id = current_profile_id() AND deleted_at IS NULL) OR is_admin())
  WITH CHECK (owner_id = current_profile_id() OR is_admin());
-- (teams_delete uses only is_admin(); public-portfolio SELECT uses no auth — unchanged.)

-- ── team_achievements ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "achievements_select" ON team_achievements;
CREATE POLICY "achievements_select" ON team_achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE id = team_id AND (owner_id = current_profile_id() OR is_admin())
    )
  );

DROP POLICY IF EXISTS "achievements_insert" ON team_achievements;
CREATE POLICY "achievements_insert" ON team_achievements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE id = team_id AND owner_id = current_profile_id() AND is_coach_verified()
    )
  );

DROP POLICY IF EXISTS "achievements_update" ON team_achievements;
CREATE POLICY "achievements_update" ON team_achievements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE id = team_id AND (owner_id = current_profile_id() OR is_admin())
    )
  );

DROP POLICY IF EXISTS "achievements_delete" ON team_achievements;
CREATE POLICY "achievements_delete" ON team_achievements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE id = team_id AND (owner_id = current_profile_id() OR is_admin())
    )
  );

-- ── sponsors ─────────────────────────────────────────────────────────────────
-- Coach-facing geo-aware visibility (last defined in 0019).
DROP POLICY IF EXISTS "sponsors_select" ON sponsors;
CREATE POLICY "sponsors_select" ON sponsors FOR SELECT
  USING (
    CASE
      WHEN is_admin() THEN true
      WHEN is_coach_verified() THEN (
        status = 'active'
        AND funding_used_cents < funding_cap_cents
        AND (
          geo_states IS NULL
          OR EXISTS (
            SELECT 1 FROM teams t
            WHERE t.owner_id = current_profile_id()
              AND t.state = ANY(geo_states)
          )
        )
      )
      ELSE false
    END
  );

-- Sponsor self-view of their own company record (0030).
DROP POLICY IF EXISTS "sponsors_select_own" ON sponsors;
CREATE POLICY "sponsors_select_own" ON sponsors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = current_profile_id()
        AND profiles.role = 'sponsor'
        AND profiles.sponsor_id = sponsors.id
    )
  );
-- (sponsors_insert/update/delete use only is_admin() — unchanged.)

-- ── submissions ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "submissions_select" ON submissions;
CREATE POLICY "submissions_select" ON submissions FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id AND (t.owner_id = current_profile_id() OR is_admin())
    )
  );

DROP POLICY IF EXISTS "submissions_select_sponsor" ON submissions;
CREATE POLICY "submissions_select_sponsor" ON submissions FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = current_profile_id()
        AND profiles.role = 'sponsor'
        AND profiles.sponsor_id = submissions.sponsor_id
    )
  );

DROP POLICY IF EXISTS "submissions_insert" ON submissions;
CREATE POLICY "submissions_insert" ON submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id
        AND t.owner_id = current_profile_id()
        AND t.deleted_at IS NULL
    )
    AND is_coach_verified()
  );

DROP POLICY IF EXISTS "submissions_update_coach" ON submissions;
CREATE POLICY "submissions_update_coach" ON submissions FOR UPDATE
  USING (
    deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.owner_id = current_profile_id())
    AND status IN ('draft', 'declined', 'changes_requested')
  )
  WITH CHECK (
    status IN ('draft', 'pending')
  );

DROP POLICY IF EXISTS "submissions_update_sponsor" ON submissions;
CREATE POLICY "submissions_update_sponsor" ON submissions FOR UPDATE
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = current_profile_id()
        AND profiles.role = 'sponsor'
        AND profiles.sponsor_id = submissions.sponsor_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = current_profile_id()
        AND profiles.role = 'sponsor'
        AND profiles.sponsor_id = submissions.sponsor_id
    )
  );

DROP POLICY IF EXISTS "submissions_delete" ON submissions;
CREATE POLICY "submissions_delete" ON submissions FOR DELETE
  USING (
    is_admin() OR
    (EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.owner_id = current_profile_id()) AND status = 'draft')
  );
-- (submissions_update_admin uses only is_admin() — unchanged.)

-- ── notifications ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "coaches_read_own_notifications" ON notifications;
CREATE POLICY "coaches_read_own_notifications" ON notifications FOR SELECT
  USING (recipient_id = current_profile_id());

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (recipient_id = current_profile_id())
  WITH CHECK (recipient_id = current_profile_id());
-- (service_insert_notifications has WITH CHECK (true) — unchanged.)

-- ── ftc_teams_cache ──────────────────────────────────────────────────────────
-- "authenticated" check: any request carrying a Clerk session token.
DROP POLICY IF EXISTS "cache_select" ON ftc_teams_cache;
CREATE POLICY "cache_select" ON ftc_teams_cache FOR SELECT
  USING ((auth.jwt() ->> 'sub') IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 5. Storage policies — partition by Clerk user id (folder prefix == sub).
--    Only the folder-scoped (own) + admin policies use the identity; the public
--    SELECT policies are unchanged.
-- ---------------------------------------------------------------------------

-- coach-credentials (private)
DROP POLICY IF EXISTS "Coaches can upload their own credentials" ON storage.objects;
CREATE POLICY "Coaches can upload their own credentials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'coach-credentials' AND
  (auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Coaches can see their own credentials" ON storage.objects;
CREATE POLICY "Coaches can see their own credentials"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'coach-credentials' AND
  (auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Admins can see all credentials" ON storage.objects;
CREATE POLICY "Admins can see all credentials"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'coach-credentials' AND public.is_admin()
);

-- pitch-media (public read)
DROP POLICY IF EXISTS "Coaches can upload their own pitch media" ON storage.objects;
CREATE POLICY "Coaches can upload their own pitch media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pitch-media' AND
  (auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
);

-- pitch-storage (public read)
DROP POLICY IF EXISTS "pitch_storage_insert_own" ON storage.objects;
CREATE POLICY "pitch_storage_insert_own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pitch-storage' AND (auth.jwt() ->> 'sub') = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "pitch_storage_delete_own" ON storage.objects;
CREATE POLICY "pitch_storage_delete_own" ON storage.objects FOR DELETE
  USING (bucket_id = 'pitch-storage' AND (auth.jwt() ->> 'sub') = (storage.foldername(name))[1]);

-- team-logos (public read)
DROP POLICY IF EXISTS "Coaches can upload their own team logo" ON storage.objects;
CREATE POLICY "Coaches can upload their own team logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'team-logos' AND
  (auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Coaches can update their own team logo" ON storage.objects;
CREATE POLICY "Coaches can update their own team logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'team-logos' AND
  (auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
);

-- visual-pitch-items (public read)
DROP POLICY IF EXISTS "Coaches can upload their own visual pitch items" ON storage.objects;
CREATE POLICY "Coaches can upload their own visual pitch items"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'visual-pitch-items' AND
  (auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Coaches can delete their own visual pitch items" ON storage.objects;
CREATE POLICY "Coaches can delete their own visual pitch items"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'visual-pitch-items' AND
  (auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
);

-- =============================================================================
-- End of migration 0051_clerk_auth.sql
-- =============================================================================
