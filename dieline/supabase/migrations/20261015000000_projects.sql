-- Projects and their saved versions. Each user only ever sees their own rows.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Untitled carton' check (char_length(name) between 1 and 200),
  params jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_updated_idx on public.projects (user_id, updated_at desc);

create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  version integer not null check (version > 0),
  label text check (label is null or char_length(label) <= 200),
  params jsonb not null,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create index if not exists project_versions_project_idx on public.project_versions (project_id, version desc);

alter table public.projects enable row level security;
alter table public.project_versions enable row level security;

create policy "Own projects: read" on public.projects for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own projects: create" on public.projects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own projects: update" on public.projects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own projects: delete" on public.projects for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Own versions: read" on public.project_versions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own versions: create" on public.project_versions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid()))
  );
create policy "Own versions: delete" on public.project_versions for delete to authenticated using ((select auth.uid()) = user_id);
