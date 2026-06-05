-- 0048_storage_limits.sql
-- M-3: Enforce upload size + MIME limits at the BUCKET level. Supabase Storage enforces
-- these server-side on every upload, so the previously bypassable client-side checks
-- (e.g. portfolio-tab's 5MB guard) are no longer the only gate. Excluding image/svg+xml
-- and any HTML type closes the stored-XSS / arbitrary-hosting vector on the public buckets.
--
-- Also reconciles migration drift: the app uploads pitch media to the 'pitch-storage'
-- bucket, which no prior migration created (it was created out-of-band in the dashboard).
-- We make it reproducible here.

-- 1. Ensure the bucket the app actually uses exists.
insert into storage.buckets (id, name, public)
values ('pitch-storage', 'pitch-storage', true)
on conflict (id) do nothing;

-- 2. Folder-scoped insert/delete + public read for pitch-storage (mirrors the other media buckets).
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'storage' and tablename = 'objects' and policyname = 'pitch_storage_insert_own'
  ) then
    create policy "pitch_storage_insert_own" on storage.objects for insert
      with check (bucket_id = 'pitch-storage' and (auth.uid())::text = (storage.foldername(name))[1]);
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'storage' and tablename = 'objects' and policyname = 'pitch_storage_select_public'
  ) then
    create policy "pitch_storage_select_public" on storage.objects for select
      using (bucket_id = 'pitch-storage');
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'storage' and tablename = 'objects' and policyname = 'pitch_storage_delete_own'
  ) then
    create policy "pitch_storage_delete_own" on storage.objects for delete
      using (bucket_id = 'pitch-storage' and (auth.uid())::text = (storage.foldername(name))[1]);
  end if;
end $$;

-- 3. Image buckets: 5 MB cap, common raster web image types only (no SVG/HTML).
update storage.buckets
   set file_size_limit = 5242880,  -- 5 MB
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
 where id in ('pitch-storage', 'pitch-media', 'visual-pitch-items');

-- 4. Team logos: 2 MB, raster + webp (matches the server-side check in app/actions/team.ts).
update storage.buckets
   set file_size_limit = 2097152,  -- 2 MB
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'team-logos';

-- 5. Coach credentials: 5 MB, PDF or image only (matches the magic-byte check in app/actions/auth.ts).
update storage.buckets
   set file_size_limit = 5242880,  -- 5 MB
       allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
 where id = 'coach-credentials';
