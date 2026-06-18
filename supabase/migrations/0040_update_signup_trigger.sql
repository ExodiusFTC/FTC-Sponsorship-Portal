-- The 'sponsor' user_role value is pre-declared in 0001, so the
-- ALTER TYPE ... ADD VALUE that used to live here is no longer needed.

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
