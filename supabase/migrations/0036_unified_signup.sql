-- Migration: 0036_unified_signup.sql
-- Project: FTC Sponsorship Portal
-- Purpose: Add new identity and compliance fields to profiles, along with a JSONB column
--          to store pending team data until admin verification.

DO $$ BEGIN
  ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS date_of_birth date,
    ADD COLUMN IF NOT EXISTS phone_number text,
    ADD COLUMN IF NOT EXISTS address_line1 text,
    ADD COLUMN IF NOT EXISTS city text,
    ADD COLUMN IF NOT EXISTS state text,
    ADD COLUMN IF NOT EXISTS zip_code text,
    ADD COLUMN IF NOT EXISTS referral_source text,
    ADD COLUMN IF NOT EXISTS coppa_acknowledged boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS tos_accepted boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS pending_team_data jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
