# Despensa em Dia 🥫

Aplicativo mobile (React Native + Expo) para controlar a validade dos alimentos de casa e reduzir o desperdício.

## 1. Problema

Em muitas casas, alimentos vencem esquecidos no fundo da geladeira ou do armário. Ninguém lembra o que foi comprado
nem quando vence. Aí a comida vai para o lixo e o dinheiro também.

**Público-alvo:** famílias, estudantes que moram sozinhos ou em república, qualquer pessoa que faz compras do mês.

**Solução:** o usuário cadastra o alimento com a data de validade e o local onde guardou. O app ordena tudo pelo que vence
primeiro, destaca com cores o que está **vencido** (vermelho) ou **vencendo em até 3 dias** (laranja) e mostra um resumo
de aproveitamento: quanto foi consumido e quanto foi jogado fora.

## 2. Funcionalidades (1º bimestre)

| Tela | O que faz |
|---|---|
| **Despensa** (aba) | Lista os alimentos ativos por ordem de validade, com busca, filtros (Todos / Vencem em 3 dias / Vencidos), puxar para sincronizar e botão **+** |
| **Novo alimento** (modal) | Nome, data de validade (calendário + atalhos +3 dias, +1 semana…), quantidade/unidade, local (Geladeira, Freezer, Armário), categoria e observação |
| **Detalhes** | Situação da validade, ações **Consumi** / **Joguei fora**, edição e exclusão |
| **Resumo** (aba) | Totais (na despensa, vencendo, vencidos, consumidos), % de aproveitamento, "Use primeiro" e contagem por local |
| **Conta** (aba) | Login/cadastro no Supabase, estado da sincronização, pendências, "Sincronizar agora" e sair |

## 3. Tecnologias obrigatórias

- **React Native + Expo (SDK 57)** com **Expo Router** para navegação (Stack + Tabs + modal)
- **Expo SQLite**: banco local `despensa.db`; o app funciona 100% offline
- **Supabase (PostgreSQL)**: tabela `public.itens`, com autenticação por e-mail e Row Level Security

## 4. Arquitetura: *local-first*

```
 Tela ──grava──► SQLite (despensa.db) ──sincronizado = 0──► fila de envio
                        ▲                                      │
                        │ pull (atualizado_em > último pull)   │ push (upsert por id)
                        └──────────── Supabase / PostgreSQL ◄──┘
```

1. Toda escrita vai **primeiro para o SQLite** e o registro fica com `sincronizado = 0`.
2. Com usuário logado e internet, o app sincroniza depois de cada alteração (1,5 s de espera para agrupar edições), ao
   abrir o app, ao voltar a ficar online e quando o usuário puxa a lista para baixo.
3. **Pull:** baixa só o que mudou desde a última sincronização (`atualizado_em`).
   **Push:** envia os pendentes com `upsert`.
4. **Conflitos:** vence a alteração mais recente (*last-write-wins* por `atualizado_em`).
5. Exclusões são **lógicas** (`excluido = 1`) para que também sejam propagadas ao servidor.
6. Os IDs são UUID gerados no aparelho (`expo-crypto`), então o mesmo registro tem o mesmo id no SQLite e no PostgreSQL.

### Estrutura de pastas

```
src/
  app/                    # rotas (Expo Router)
    _layout.tsx           # SQLiteProvider + SyncProvider + Stack
    (tabs)/_layout.tsx    # abas Despensa, Resumo, Conta
    (tabs)/index.tsx      # lista da despensa
    (tabs)/resumo.tsx     # indicadores
    (tabs)/conta.tsx      # login e sincronização
    item/novo.tsx         # cadastro (modal)
    item/[id].tsx         # detalhes/edição
  db/schema.ts            # criação/migração do SQLite (PRAGMA user_version)
  db/itens.ts             # consultas SQL (CRUD, resumo, fila)
  sync/sincronizar.ts     # pull/push com o Supabase
  sync/SyncContext.tsx    # sessão, estado online/offline, gatilhos de sync
  lib/supabase.ts         # cliente Supabase (sessão guardada via expo-sqlite/localStorage)
  lib/datas.ts            # cálculo de dias para vencer
  components/             # ItemCard, ItemForm, Chip, Botao, IndicadorSync
supabase/schema.sql       # tabela, índices e políticas RLS do PostgreSQL
```

### Modelo de dados

| Campo | SQLite | PostgreSQL |
|---|---|---|
| id | TEXT (UUID) | uuid PK |
| user_id | — | uuid → auth.users |
| nome, categoria, unidade, local, observacao | TEXT | text |
| quantidade | REAL | numeric(10,2) |
| validade | TEXT `AAAA-MM-DD` | date |
| status | TEXT (ativo, consumido, descartado) | text + check |
| criado_em, atualizado_em | TEXT ISO 8601 | timestamptz |
| excluido | INTEGER 0/1 | boolean |
| sincronizado | INTEGER 0/1 (só local) | — |

## 5. Como rodar

Pré-requisitos: **Node.js 20 LTS ou superior** e o app **Expo Go** no celular (Android ou iOS).

```bash
npm install
cp .env.example .env      # preencha com a URL e a chave publishable do Supabase
npx expo start            # leia o QR code com o Expo Go
```

Sem o `.env` o app roda em **modo somente local** (apenas SQLite), o que é útil para testar offline.

### Configurar o Supabase

1. Crie um projeto em https://supabase.com.
2. Em **SQL Editor**, execute `supabase/schema.sql` e depois `supabase/usuarios.sql` (login por e-mail ou nome de usuário).
3. Em **Project Settings → API**, copie a *Project URL* e a *publishable key* para o `.env`.
4. (Opcional, para testes) Em **Authentication → Sign In / Providers → Email**, desative *Confirm email* para entrar sem
   confirmar o e-mail.

### Testar a sincronização (roteiro de apresentação)

1. Cadastre 2 ou 3 alimentos **sem estar logado**: ficam só no SQLite.
2. Na aba **Conta**, crie a conta e entre. Os itens sobem para o Supabase (confira em *Table Editor → itens*).
3. Ative o modo avião, cadastre outro item: o indicador mostra "Sem internet" / "pendente".
4. Desligue o modo avião: o item é enviado sozinho.
5. Edite um registro direto no Table Editor (atualize também `atualizado_em`) e puxe a lista: a mudança aparece no app.

## 6. Próxima etapa (2º bimestre): visão computacional

- **Ler a data de validade pela câmera** (OCR com `expo-camera` e reconhecimento de texto) e preencher o campo
  automaticamente.
- Ler o **código de barras** para sugerir o nome do produto.
- Notificações locais quando algo estiver para vencer (`expo-notifications`).

O formulário (`ItemForm`) já recebe os dados por props, então a câmera só precisará preencher `nome` e `validade`.

## 7. Versão web (para apresentação)

O mesmo código roda no navegador. O SQLite funciona via WebAssembly, e o Supabase continua sincronizando.

```bash
npx expo start --web              # testar no PC (abre em http://localhost:8081)
npm run build:web                 # gera a pasta dist/ pronta para o Netlify
```

O `build:web` também renomeia `dist/assets/node_modules` para `dist/assets/nm`, porque o Netlify ignora pastas com esse nome. A pasta `dist/` pode ser publicada no Netlify: arraste-a em https://app.netlify.com/drop. Os arquivos
`public/_headers` e `public/_redirects` já vão junto e ativam os cabeçalhos que o SQLite web exige
(`Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`).
