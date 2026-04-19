-- 0024_text_fields.sql
-- Convert robot-spec enum columns to plain text so the Portfolio tab can
-- accept free-form input without being constrained to the original enum values.

ALTER TABLE teams
  ALTER COLUMN drivetrain  TYPE text USING drivetrain::text,
  ALTER COLUMN build_system TYPE text USING build_system::text,
  ALTER COLUMN programming  TYPE text USING programming::text;

-- Drop the old enum types (no longer needed)
DROP TYPE IF EXISTS drivetrain_type;
DROP TYPE IF EXISTS build_system_type;
DROP TYPE IF EXISTS programming_lang;
