-- Create a bucket for pitch media
insert into storage.buckets (id, name, public)
values ('pitch-media', 'pitch-media', true); -- public because they'll be in emails? 
-- Actually, better keep it private and use signed URLs or just allow public read if not sensitive.
-- For now, let's keep it public for easy email rendering.

-- Set up RLS for the bucket
create policy "Coaches can upload their own pitch media"
on storage.objects for insert
with check (
  bucket_id = 'pitch-media' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Public can see pitch media"
on storage.objects for select
using (bucket_id = 'pitch-media');
