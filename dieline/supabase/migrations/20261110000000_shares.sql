-- Share links: an uploaded design (its 3D model and artwork image) that anyone
-- with the link can view, until its owner turns the link off (deletes it).

create table if not exists public.shares (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{16,40}$'),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  model jsonb not null,
  art_path text not null,
  art jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists shares_user_idx on public.shares (user_id, created_at desc);

alter table public.shares enable row level security;

create policy "Own shares: read" on public.shares for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own shares: create" on public.shares for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own shares: delete" on public.shares for delete to authenticated using ((select auth.uid()) = user_id);

-- Anyone with the link reads that one share, never the list.
create or replace function public.get_share(share_id text)
returns table (name text, model jsonb, art_path text, art jsonb, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.name, s.model, s.art_path, s.art, s.created_at from public.shares s where s.id = share_id;
$$;

revoke execute on function public.get_share(text) from public;
grant execute on function public.get_share(text) to anon, authenticated;

-- Artwork images: public by their unguessable path, written and removed only by their owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shares', 'shares', true, 15728640, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "Share images: upload" on storage.objects for insert to authenticated with check (bucket_id = 'shares');
create policy "Share images: remove own" on storage.objects for delete to authenticated using (bucket_id = 'shares' and owner_id = (select auth.uid())::text);
