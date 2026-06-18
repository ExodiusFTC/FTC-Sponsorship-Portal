-- Create a bucket for pitch media
insert into storage.buckets (id, name, public)
values ('pitch-media', 'pitch-media', true) -- public for easy email rendering
on conflict (id) do nothing;

-- Set up RLS for the bucket
drop policy if exists "Coaches can upload their own pitch media" on storage.objects;
create policy "Coaches can upload their own pitch media"
on storage.objects for insert
with check (
  bucket_id = 'pitch-media' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "Public can see pitch media" on storage.objects;
create policy "Public can see pitch media"
on storage.objects for select
using (bucket_id = 'pitch-media');
