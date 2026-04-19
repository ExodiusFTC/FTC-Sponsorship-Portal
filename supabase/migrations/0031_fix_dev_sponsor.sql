-- =============================================================================
-- Migration: 0031_fix_dev_sponsor.sql
-- Purpose:   Explicitly ensure the dev sponsor user exists and has the right role.
--            This helps if the dev-auth logic hit a race condition or migration lag.
-- =============================================================================

-- 1. Ensure the Test Sponsor Corp exists
INSERT INTO sponsors (company_name, contact_name, contact_email, funding_cap_cents, status)
VALUES ('Test Sponsor Corp', 'Test Sponsor', 'devsponsor@test.local', 500000, 'active')
ON CONFLICT (company_name) DO NOTHING;

-- 2. If the user exists in auth.users, force their profile to 'sponsor'
DO $$
DECLARE
    dev_uid uuid;
    corp_id uuid;
BEGIN
    SELECT id INTO dev_uid FROM auth.users WHERE email = 'devsponsor@test.local';
    SELECT id INTO corp_id FROM sponsors WHERE company_name = 'Test Sponsor Corp';

    IF dev_uid IS NOT NULL AND corp_id IS NOT NULL THEN
        INSERT INTO profiles (id, email, full_name, role, coach_verified, sponsor_id)
        VALUES (dev_uid, 'devsponsor@test.local', 'Test Sponsor', 'sponsor', true, corp_id)
        ON CONFLICT (id) DO UPDATE SET
            role = 'sponsor',
            coach_verified = true,
            sponsor_id = corp_id;
    END IF;
END $$;
