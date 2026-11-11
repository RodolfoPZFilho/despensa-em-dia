-- Despensa em Dia — estrutura do banco online (Supabase / PostgreSQL)
-- Execute no Supabase: Dashboard > SQL Editor > New query > colar e "Run".

create table if not exists public.itens (
  id             uuid primary key,                       -- gerado no app (mesmo id do SQLite)
  user_id        uuid not null references auth.users (id) on delete cascade default auth.uid(),
  nome           text not null check (char_length(nome) between 1 and 120),
  categoria      text not null,
  quantidade     numeric(10,2) not null default 1 check (quantidade > 0),
  unidade        text not null default 'un',
  local          text not null check (local in ('Geladeira', 'Freezer', 'Armário')),
  validade       date not null,
  status         text not null default 'ativo' check (status in ('ativo', 'consumido', 'descartado')),
  observacao     text,
  codigo_barras  text check (codigo_barras is null or codigo_barras ~ '^[0-9]{6,14}$'), -- visão computacional: código lido pela câmera
  validade_origem text not null default 'manual' check (validade_origem in ('manual', 'ocr')), -- 'ocr' = data lida na foto
  texto_ocr      text,                                   -- visão computacional: texto lido na embalagem
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),     -- usado na sincronização incremental
  excluido       boolean not null default false          -- exclusão lógica vinda do app
);

create index if not exists itens_user_atualizado_idx on public.itens (user_id, atualizado_em);
create index if not exists itens_user_validade_idx  on public.itens (user_id, validade) where not excluido;
create index if not exists itens_user_codigo_idx    on public.itens (user_id, codigo_barras) where codigo_barras is not null;

-- Segurança: cada usuário só enxerga e altera os próprios alimentos (Row Level Security)
alter table public.itens enable row level security;

drop policy if exists "itens_select_proprios" on public.itens;
drop policy if exists "itens_insert_proprios" on public.itens;
drop policy if exists "itens_update_proprios" on public.itens;
drop policy if exists "itens_delete_proprios" on public.itens;

create policy "itens_select_proprios" on public.itens
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "itens_insert_proprios" on public.itens
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "itens_update_proprios" on public.itens
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "itens_delete_proprios" on public.itens
  for delete to authenticated using ((select auth.uid()) = user_id);
