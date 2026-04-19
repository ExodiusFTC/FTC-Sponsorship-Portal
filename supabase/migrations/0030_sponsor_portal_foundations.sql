-- =============================================================================
-- Migration: 0030_sponsor_portal_foundations.sql
-- Purpose:   Establish the data foundations for the Sponsor Portal.
--            1. Add 'sponsor' to user_role enum.
--            2. Add sponsor_id to profiles for account linking.
--            3. Add RLS policies for sponsor-specific data access.
-- =============================================================================

-- 1. Add 'sponsor' to user_role enum
-- Enums can't be updated in a transaction easily in older PG, but Supabase supports it.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sponsor';

-- 2. Add sponsor_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sponsor_id uuid REFERENCES sponsors(id) ON DELETE SET NULL;

-- 3. Update RLS on submissions for Sponsors
-- Sponsors should be able to see submissions targeted at them.
DROP POLICY IF EXISTS "submissions_select_sponsor" ON submissions;
CREATE POLICY "submissions_select_sponsor" ON submissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sponsor'
            AND profiles.sponsor_id = submissions.sponsor_id
        )
    );

-- Sponsors should be able to update submission status (approve/decline/feedback)
DROP POLICY IF EXISTS "submissions_update_sponsor" ON submissions;
CREATE POLICY "submissions_update_sponsor" ON submissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sponsor'
            AND profiles.sponsor_id = submissions.sponsor_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sponsor'
            AND profiles.sponsor_id = submissions.sponsor_id
        )
    );

-- 4. Update RLS on sponsors table
-- Sponsors should be able to see their own company record
DROP POLICY IF EXISTS "sponsors_select_own" ON sponsors;
CREATE POLICY "sponsors_select_own" ON sponsors FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'sponsor'
            AND profiles.sponsor_id = sponsors.id
-- 5. Helper function to atomically increment sponsor funding
CREATE OR REPLACE FUNCTION increment_sponsor_funding(sponsor_uuid uuid, amount bigint)
RETURNS void AS $$
BEGIN
    UPDATE sponsors
    SET funding_used_cents = funding_used_cents + amount
    WHERE id = sponsor_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
