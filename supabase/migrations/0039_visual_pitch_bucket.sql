
-- Create missing bucket for visual pitch items
insert into storage.buckets (id, name, public)
values ('visual-pitch-items', 'visual-pitch-items', true);

-- RLS policies for visual-pitch-items
create policy "Coaches can upload their own visual pitch items"
on storage.objects for insert
with check (
  bucket_id = 'visual-pitch-items' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Public can view visual pitch items"
on storage.objects for select
using (bucket_id = 'visual-pitch-items');

create policy "Coaches can delete their own visual pitch items"
on storage.objects for delete
using (
  bucket_id = 'visual-pitch-items' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);
