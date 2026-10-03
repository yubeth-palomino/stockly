create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists users_email_lower_uidx
  on public.users (lower(email))
  where email is not null;

alter table public.users enable row level security;
revoke all on table public.users from anon, authenticated;
grant select on table public.users to authenticated;
grant update (full_name) on table public.users to authenticated;

drop policy if exists "Users can read their own profile" on public.users;
create policy "Users can read their own profile"
  on public.users for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
  on public.users for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $profile$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case
          when excluded.full_name <> '' then excluded.full_name
          else public.users.full_name
        end,
        updated_at = now();

  return new;
end;
$profile$;

drop trigger if exists on_auth_user_profile_created on auth.users;
create trigger on_auth_user_profile_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user_profile();

revoke execute on function public.handle_auth_user_profile() from public, anon, authenticated;