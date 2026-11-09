-- Carton styles made for one account. Set by the studio, never by the user:
-- users may only write their own name, company and phone.

alter table public.profiles add column if not exists styles text[] not null default '{}';

revoke insert, update on public.profiles from authenticated, anon;
grant insert (id, full_name, company, phone, onboarded_at, updated_at) on public.profiles to authenticated;
grant update (id, full_name, company, phone, onboarded_at, updated_at) on public.profiles to authenticated;
