-- Add 'sponsor' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sponsor';

-- Update handle_new_user to respect role from metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(LEFT(NEW.raw_user_meta_data->>'full_name', 200), ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'coach')::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
