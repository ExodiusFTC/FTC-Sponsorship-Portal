-- Create a bucket for coach credentials
insert into storage.buckets (id, name, public)
values ('coach-credentials', 'coach-credentials', false)
on conflict (id) do nothing;

-- Set up RLS for the bucket
-- Allow coaches to upload their own credentials
drop policy if exists "Coaches can upload their own credentials" on storage.objects;
create policy "Coaches can upload their own credentials"
on storage.objects for insert
with check (
  bucket_id = 'coach-credentials' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow coaches to see their own credentials
drop policy if exists "Coaches can see their own credentials" on storage.objects;
create policy "Coaches can see their own credentials"
on storage.objects for select
using (
  bucket_id = 'coach-credentials' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow admins to see all credentials
drop policy if exists "Admins can see all credentials" on storage.objects;
create policy "Admins can see all credentials"
on storage.objects for select
using (
  bucket_id = 'coach-credentials' AND
  (
    select role from public.profiles
    where id = auth.uid()
  ) = 'admin'
);
