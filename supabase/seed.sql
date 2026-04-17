-- Seed data for FTC Sponsorship Portal

-- 1. Create some sponsors
INSERT INTO public.sponsors (company_name, industry, website, contact_name, contact_email, funding_cap_cents, status, source)
VALUES
  ('Tech Giant', 'Technology', 'https://techgiant.com', 'Jane Smith', 'jane@techgiant.com', 5000000, 'active', 'admin_added'),
  ('Local Bank', 'Finance', 'https://localbank.com', 'Bob Johnson', 'bob@localbank.com', 2000000, 'active', 'admin_added'),
  ('Robotics Corp', 'Manufacturing', 'https://robocorp.com', 'Alice Brown', 'alice@robocorp.com', 10000000, 'active', 'admin_added')
ON CONFLICT DO NOTHING;

-- Note: auth.users cannot be easily seeded via SQL in Supabase without bypass.
-- In local development, you should sign up manually and then promote yourself to admin:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
