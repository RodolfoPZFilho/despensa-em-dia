-- Despensa em Dia — 2º bimestre: resultados da visão computacional
-- Execute UMA vez no Supabase (SQL Editor) depois de schema.sql e usuarios.sql.
-- Bancos novos não precisam: schema.sql já cria estas colunas.

alter table public.itens add column if not exists codigo_barras   text;
alter table public.itens add column if not exists validade_origem text not null default 'manual';
alter table public.itens add column if not exists texto_ocr       text;

alter table public.itens drop constraint if exists itens_validade_origem_check;
alter table public.itens add constraint itens_validade_origem_check check (validade_origem in ('manual', 'ocr'));

alter table public.itens drop constraint if exists itens_codigo_barras_check;
alter table public.itens add constraint itens_codigo_barras_check check (codigo_barras is null or codigo_barras ~ '^[0-9]{6,14}$');

create index if not exists itens_user_codigo_idx on public.itens (user_id, codigo_barras) where codigo_barras is not null;
