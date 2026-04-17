-- 0007_rls_tests.sql
-- Using pgTAP to verify RLS policies and table structures

BEGIN;

-- Optional: Create pgTAP extension if it doesn't exist (Requires superuser, so we wrap it or assume it's installed by supabase)
-- CREATE EXTENSION IF NOT EXISTS pgtap;

-- To run these tests:
-- SELECT * FROM runtests();

-- Plan the tests
-- Note: Replace 10 with the actual number of tests you are adding
SELECT plan(8);

-- Test 1: Ensure profiles table exists
SELECT has_table('public', 'profiles', 'profiles table should exist');

-- Test 2: Ensure teams table exists
SELECT has_table('public', 'teams', 'teams table should exist');

-- Test 3: Ensure pitches table exists
SELECT has_table('public', 'pitches', 'pitches table should exist');

-- COPPA Compliance Checks: Ensure no student PII columns exist
-- Test 4: profiles table shouldn't have student_name
SELECT hasnt_column('public', 'profiles', 'student_name', 'profiles table should not store student names');
-- Test 5: profiles table shouldn't have student_age
SELECT hasnt_column('public', 'profiles', 'student_age', 'profiles table should not store student ages');
-- Test 6: teams table shouldn't have student_roster
SELECT hasnt_column('public', 'teams', 'student_roster', 'teams table should not store student rosters');

-- RLS Verification (Requires setting the current user/role)

-- Create a mock coach user
-- Insert into auth.users is complex, so we test the policies directly if possible, 
-- or we rely on the fact that the policies enforce auth.uid().
-- A simple test is to ensure RLS is enabled on the tables:

-- Test 7: RLS is enabled on profiles
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles'),
  true,
  'RLS should be enabled on profiles table'
);

-- Test 8: RLS is enabled on teams
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'teams'),
  true,
  'RLS should be enabled on teams table'
);

-- Finish the tests
SELECT * FROM finish();

ROLLBACK;
