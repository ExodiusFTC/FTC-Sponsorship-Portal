insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

drop policy if exists "Coaches can upload their own team logo" on storage.objects;
create policy "Coaches can upload their own team logo"
on storage.objects for insert
with check (
  bucket_id = 'team-logos' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "Coaches can update their own team logo" on storage.objects;
create policy "Coaches can update their own team logo"
on storage.objects for update
using (
  bucket_id = 'team-logos' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "Public can view team logos" on storage.objects;
create policy "Public can view team logos"
on storage.objects for select
using (bucket_id = 'team-logos');
