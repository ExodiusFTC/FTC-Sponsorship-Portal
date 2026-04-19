-- =============================================================================
-- Migration: 0029_add_contact_name_to_applications.sql
-- Purpose:   Add contact_name to sponsor_applications table.
--            This column was missing in the initial schema but is required
--            by the Zod schema and the admin approval workflow.
-- =============================================================================

-- 1. Add the column
-- Since there might be existing data, we first add it as nullable
ALTER TABLE sponsor_applications ADD COLUMN IF NOT EXISTS contact_name text;

-- 2. Backfill existing rows if any (optional, but good practice)
-- Using 'Unknown' as placeholder for any orphan records
UPDATE sponsor_applications SET contact_name = 'Unknown' WHERE contact_name IS NULL;

-- 3. Make it NOT NULL
ALTER TABLE sponsor_applications ALTER COLUMN contact_name SET NOT NULL;
