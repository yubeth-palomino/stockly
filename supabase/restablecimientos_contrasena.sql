create table if not exists public.restablecimientos_contrasena (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.users (id) on delete cascade,
  token_hash text not null unique,
  expira_en timestamptz not null,
  usado_en timestamptz null,
  creado_en timestamptz not null default now()
);

create index if not exists restablecimientos_contrasena_usuario_idx
  on public.restablecimientos_contrasena (usuario_id);

alter table public.restablecimientos_contrasena enable row level security;
revoke all on table public.restablecimientos_contrasena from anon, authenticated;
grant all on table public.restablecimientos_contrasena to service_role;

create or replace function public.contar_solicitudes_restab(p_usuario_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $func$
  select count(*)
  from public.restablecimientos_contrasena
  where usuario_id = p_usuario_id
    and creado_en > now() - interval '15 minutes';
$func$;

create or replace function public.invalidar_tokens_restab(p_usuario_id uuid)
returns void
language sql
security definer
set search_path = ''
as $func$
  update public.restablecimientos_contrasena
  set usado_en = now()
  where usuario_id = p_usuario_id
    and usado_en is null
    and expira_en > now();
$func$;

create or replace function public.crear_token_restab(p_usuario_id uuid, p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $func$
declare
  nuevo_id uuid;
begin
  insert into public.restablecimientos_contrasena (usuario_id, token_hash, expira_en)
  values (p_usuario_id, p_token_hash, now() + interval '30 minutes')
  returning id into nuevo_id;

  return nuevo_id;
end;
$func$;

create or replace function public.buscar_token_restab(p_token_hash text)
returns table (id uuid, usuario_id uuid)
language sql
stable
security definer
set search_path = ''
as $func$
  select restablecimientos_contrasena.id, restablecimientos_contrasena.usuario_id
  from public.restablecimientos_contrasena
  where token_hash = p_token_hash
    and usado_en is null
    and expira_en > now()
  limit 1;
$func$;

create or replace function public.marcar_token_restab_usado(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $func$
begin
  update public.restablecimientos_contrasena
  set usado_en = now()
  where id = p_id
    and usado_en is null
    and expira_en > now();

  return found;
end;
$func$;

revoke all on function public.contar_solicitudes_restab(uuid) from public, anon, authenticated;
revoke all on function public.invalidar_tokens_restab(uuid) from public, anon, authenticated;
revoke all on function public.crear_token_restab(uuid, text) from public, anon, authenticated;
revoke all on function public.buscar_token_restab(text) from public, anon, authenticated;
revoke all on function public.marcar_token_restab_usado(uuid) from public, anon, authenticated;
grant execute on function public.contar_solicitudes_restab(uuid) to service_role;
grant execute on function public.invalidar_tokens_restab(uuid) to service_role;
grant execute on function public.crear_token_restab(uuid, text) to service_role;
grant execute on function public.buscar_token_restab(text) to service_role;
grant execute on function public.marcar_token_restab_usado(uuid) to service_role;