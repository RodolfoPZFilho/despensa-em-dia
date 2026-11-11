-- Despensa em Dia — login por e-mail OU nome de usuário
-- Execute no Supabase: Dashboard > SQL Editor > New query > colar e "Run".
-- Pode ser executado mais de uma vez sem problema.

-- 1. Nome de usuário de cada conta (único, minúsculo, 3 a 20 caracteres: letras, números, ponto e _)
create table if not exists public.perfis (
  id        uuid primary key references auth.users (id) on delete cascade,
  usuario   text not null unique check (usuario ~ '^[a-z0-9._]{3,20}$'),
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

drop policy if exists "perfis_select_proprio" on public.perfis;
create policy "perfis_select_proprio" on public.perfis
  for select to authenticated using ((select auth.uid()) = id);

-- 2. Ao criar a conta, grava o usuário que veio do cadastro do app (user_metadata.usuario)
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'usuario', '') <> '' then
    insert into public.perfis (id, usuario)
    values (new.id, lower(trim(new.raw_user_meta_data ->> 'usuario')));
  end if;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- 3. Login por usuário: devolve o e-mail da conta para o app fazer o login normal
create or replace function public.email_do_usuario(p_usuario text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from public.perfis p
  join auth.users u on u.id = p.id
  where p.usuario = lower(trim(p_usuario))
  limit 1;
$$;

-- 4. Cadastro: avisa se o usuário já está em uso
create or replace function public.usuario_disponivel(p_usuario text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.perfis where usuario = lower(trim(p_usuario)));
$$;

revoke all on function public.email_do_usuario(text) from public;
revoke all on function public.usuario_disponivel(text) from public;
grant execute on function public.email_do_usuario(text) to anon, authenticated;
grant execute on function public.usuario_disponivel(text) to anon, authenticated;
