insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true);

create policy "Coaches can upload their own team logo"
on storage.objects for insert
with check (
  bucket_id = 'team-logos' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Coaches can update their own team logo"
on storage.objects for update
using (
  bucket_id = 'team-logos' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Public can view team logos"
on storage.objects for select
using (bucket_id = 'team-logos');
