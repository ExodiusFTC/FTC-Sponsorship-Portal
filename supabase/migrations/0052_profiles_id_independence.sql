-- 0052_profiles_id_independence.sql
--
-- Makes profiles.id a self-contained application UUID under Clerk.
--
-- Background: in the original Supabase-Auth schema (0001_init.sql) profiles.id was
--   `uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
-- and was populated by the handle_new_user trigger from the auth.users row. The
-- Clerk migration (0051) dropped that trigger, so profiles are now created directly
-- by the app (app/actions/auth.ts) and the seeder — but two things were missed:
--   1. profiles.id had no DEFAULT, so an INSERT without an explicit id fails with
--      "null value in column \"id\" violates not-null constraint".
--   2. profiles.id still referenced auth.users(id); we no longer write auth.users,
--      so any generated id would also fail that foreign key.
-- This migration fixes both. Idempotent: safe to replay.

-- 1. Drop the legacy FK to auth.users(id) (name is the Postgres default for an
--    inline column REFERENCES; the DO block also catches any non-standard name).
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype  = 'f'
    AND confrelid = 'auth.users'::regclass;
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

-- 2. Auto-generate the primary key so app/seeder inserts don't have to supply one.
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
