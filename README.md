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
| **Detalhes** (aba) | Listas de a vencer, vencidos, consumidos e descartados |
| **Conta** (aba) | Login/cadastro no Supabase, estado da sincronização, pendências, "Sincronizar agora" e sair |
| **Login** | Entrada por e-mail ou nome de usuário (exigida quando o Supabase está configurado) |

## 3. Visão computacional (2º bimestre)

O maior atrito do app era **digitar** cada alimento e a validade. Isso fazia o usuário desistir de cadastrar, e um alimento
que não está no app pode vencer esquecido. Agora a câmera faz esse trabalho em dois pontos do formulário **Novo alimento**:

| Recurso | Técnica | O que acontece |
|---|---|---|
| **Código** (ícone ao lado do nome) | Detecção e decodificação de **código de barras** EAN-13/EAN-8/UPC em tempo real (`expo-camera`) | O número lido busca o produto **primeiro na própria despensa** (SQLite, funciona offline) e depois na base aberta **Open Food Facts**. Nome e categoria são preenchidos. Se o produto já foi cadastrado antes, também volta a unidade e o local usados da última vez. |
| **Ler data** (ícone ao lado da validade) | **OCR**: foto da embalagem → texto (API OCR.space via **Supabase Edge Function**) → interpretação da data | O app recorta a faixa enquadrada, reduz a foto e envia à função `ocr-validade`. O texto devolvido passa por `extrairValidade()`, que reconhece formatos como `VAL 12/03/27`, `FAB 10.09.26 VAL 10.03.27`, `VENC 15 JAN 2027`, `03/2027` e `VAL 120327`, separa **fabricação × validade** pelas palavras próximas e sugere a validade. Quando há mais de uma data, todas aparecem como opções. |

**Como os resultados são usados pelo sistema:**

- Cada alimento guarda `codigo_barras`, `validade_origem` (`manual` ou `ocr`) e `texto_ocr` no **SQLite**, e esses campos
  sobem para o **Supabase** pela mesma sincronização, associados ao usuário (RLS).
- O código de barras vira uma **memória de produtos**: escanear de novo um item já cadastrado (até em outro aparelho, depois do
  sync) preenche o formulário sem internet.
- A data lida define a **validade**, e é ela que ordena a lista e gera os alertas de vencido/vencendo.
- A tela do alimento mostra o que foi lido pela câmera, e o **Resumo** conta quantos itens foram cadastrados por código de barras
  e por OCR.
- Se o usuário corrigir a data à mão, `validade_origem` volta a ser `manual`. Isso permite medir a taxa de acerto do OCR.

**Por que OCR em nuvem (Edge Function)?** Reconhecimento de texto no próprio aparelho (ML Kit) exige build nativo e não roda no
Expo Go. A Edge Function mantém a chave da API **fora do app**, exige usuário logado (JWT) e funciona igual no celular e na web.

Testes: `npm test` (interpretador de datas com casos reais de embalagens + tabela de armazenamento).

### Dica de armazenamento e prazo de aviso

Quando o alimento é reconhecido (pelo nome digitado ou pelo código de barras), o formulário:

- **sugere o local** (Geladeira, Freezer ou Armário) e a categoria, sem desfazer o que o usuário já escolheu;
- mostra uma **dica breve** de conservação, por exemplo "Iogurte: geladeira, na prateleira do meio (não na porta). Aberto:
  consumir em até 3 dias.";
- se a Open Food Facts tiver a instrução do fabricante em português (`conservation_conditions_pt`), ela aparece junto.

A dica vem de uma tabela própria (`src/lib/armazenamento.ts`). A Open Food Facts tem o campo de conservação, mas ele só está
preenchido em cerca de 2% dos produtos brasileiros mais escaneados, e quase sempre em outro idioma. Por isso a API é usada como
complemento, e a tabela garante a dica sem internet.

## 3.1 Avisos de vencimento (notificações)

Cada tipo de alimento tem um **prazo de aviso**. Quanto mais perecível, mais perto do vencimento é o aviso, porque a validade já é
curta. Quanto mais durável, mais cedo o aviso, para dar tempo de usar:

| Alimento | Avisar antes |
|---|---|
| Carnes, frango, peixe, pão, bolo, verduras, banana | 1 dia |
| Iogurte, frios, embutidos, frutas e legumes | 2 dias |
| Queijo, requeijão, batata/cebola, padrão de laticínios | 3 dias |
| Leite, ovos | 5 dias |
| Suco, manteiga | 7 dias |
| Leite condensado/creme de leite, biscoito, molhos, refrigerante, congelados | 15 dias |
| Arroz, feijão, macarrão, farinhas, café, óleo, enlatados | 30 dias |

O prazo vale para tudo no app: a cor laranja, o filtro **Perto de vencer**, o Resumo e as **notificações**.

- Na aba **Conta → Avisos de vencimento** o usuário liga as notificações e **escolhe o horário**. O botão **Testar notificação**
  envia uma notificação em 5 segundos.
- São notificações **locais** (`expo-notifications`): ficam agendadas no aparelho e chegam mesmo sem internet e com o app fechado.
- Um aviso chega no dia em que o alimento entra no prazo e outro no dia do vencimento. Alimentos do mesmo dia vêm juntos numa
  notificação só. Tocar nela abre o alimento (ou a lista "A vencer").
- A agenda é refeita sozinha a cada cadastro, edição ou sincronização.
- No navegador não há notificações agendadas, só os destaques visuais.

## 4. Tecnologias obrigatórias

- **React Native + Expo (SDK 58)** com **Expo Router** para navegação (Stack + Tabs + modal)
- **Expo SQLite**: banco local `despensa.db`; o app funciona 100% offline
- **Supabase (PostgreSQL)**: tabela `public.itens`, com autenticação por e-mail e Row Level Security
- **Visão computacional**: `expo-camera` (leitura de código de barras), OCR.space (reconhecimento de texto) chamado por uma
  **Supabase Edge Function**, `expo-image-manipulator` (recorte/redução da foto) e Open Food Facts (dados do produto)

## 5. Arquitetura: *local-first*

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
    (tabs)/_layout.tsx    # abas Despensa, Resumo, Detalhes, Conta
    (tabs)/index.tsx      # lista da despensa
    (tabs)/resumo.tsx     # indicadores (inclui uso da câmera)
    (tabs)/detalhes.tsx   # a vencer, vencidos, consumidos, descartados
    (tabs)/conta.tsx      # conta e sincronização
    login.tsx             # entrada por e-mail ou usuário
    item/novo.tsx         # cadastro (modal)
    item/[id].tsx         # detalhes/edição + o que foi lido pela câmera
  db/schema.ts            # criação/migração do SQLite (PRAGMA user_version; v2 = colunas da visão)
  db/itens.ts             # consultas SQL (CRUD, resumo, fila)
  sync/sincronizar.ts     # pull/push com o Supabase
  sync/SyncContext.tsx    # sessão, estado online/offline, gatilhos de sync
  lib/supabase.ts         # cliente Supabase (sessão guardada via expo-sqlite/localStorage)
  lib/datas.ts            # cálculo de dias para vencer
  lib/alertas.ts          # alert/confirm que funcionam também na web
  lib/visao.ts            # OCR (Edge Function) e busca de produto por código de barras
  lib/validadeOcr.ts      # interpreta o texto do OCR e encontra a validade
  lib/armazenamento.ts    # local, dica de conservação e prazo de aviso por alimento
  lib/notificacoes.ts     # agenda as notificações locais de vencimento
  components/AgendadorNotificacoes.tsx  # refaz a agenda quando os dados mudam
  components/BlocoNotificacoes.tsx      # liga/desliga e horário (aba Conta)
  components/CameraVisao.tsx  # câmera: leitor de código de barras e foto da validade
  components/             # ItemCard, ItemForm, Chip, Botao, IndicadorSync
supabase/schema.sql       # tabela, índices e políticas RLS do PostgreSQL
supabase/usuarios.sql     # login por nome de usuário
supabase/visao.sql        # migração do 2º bimestre (colunas da visão computacional)
supabase/functions/ocr-validade/index.ts  # Edge Function de OCR
scripts/testar-validade-ocr.mjs           # testes do interpretador de datas
scripts/testar-armazenamento.mjs          # testes da tabela de armazenamento/prazos
```

### Modelo de dados

| Campo | SQLite | PostgreSQL |
|---|---|---|
| id | TEXT (UUID) | uuid PK |
| user_id | — | uuid → auth.users |
| nome, categoria, unidade, local, observacao | TEXT | text |
| codigo_barras | TEXT | text (6 a 14 dígitos) |
| validade_origem | TEXT `manual`/`ocr` | text + check |
| texto_ocr | TEXT | text |
| dias_aviso | INTEGER (só local, calculado pelo tipo do alimento) | — |
| quantidade | REAL | numeric(10,2) |
| validade | TEXT `AAAA-MM-DD` | date |
| status | TEXT (ativo, consumido, descartado) | text + check |
| criado_em, atualizado_em | TEXT ISO 8601 | timestamptz |
| excluido | INTEGER 0/1 | boolean |
| sincronizado | INTEGER 0/1 (só local) | — |

## 6. Como rodar

Pré-requisitos: **Node.js 20 LTS ou superior** e o app **Expo Go** atualizado no celular (Android ou iOS). O Expo Go da loja só abre a SDK mais recente: se ele abrir e fechar na hora, o projeto precisa ser atualizado (`npx expo install expo@latest --fix`).

```bash
npm install
cp .env.example .env      # preencha com a URL e a chave publishable do Supabase
npx expo start            # leia o QR code com o Expo Go
```

Sem o `.env` o app roda em **modo somente local** (apenas SQLite), o que é útil para testar offline.

### Configurar o Supabase

1. Crie um projeto em https://supabase.com.
2. Em **SQL Editor**, execute `supabase/schema.sql` e depois `supabase/usuarios.sql` (login por e-mail ou nome de usuário).
   **Projeto já criado no 1º bimestre:** execute também `supabase/visao.sql`. Sem essas colunas a sincronização falha.
3. Em **Project Settings → API**, copie a *Project URL* e a *publishable key* para o `.env`.
4. **Edge Function de OCR:** em **Edge Functions → Deploy a new function → Via Editor**, crie a função com o nome
   `ocr-validade`, cole o conteúdo de `supabase/functions/ocr-validade/index.ts` e publique (deixe *Verify JWT* ligado).
   Pela CLI: `npx supabase functions deploy ocr-validade --project-ref <ref>`.
5. **Chave do OCR:** crie uma chave grátis em https://ocr.space/ocrapi e, em **Edge Functions → Secrets**, adicione
   `OCR_SPACE_API_KEY`. Sem ela a função usa a chave de demonstração `helloworld`, que é muito limitada.
6. (Opcional, para testes) Em **Authentication → Sign In / Providers → Email**, desative *Confirm email* para entrar sem
   confirmar o e-mail.

### Testar a sincronização (roteiro de apresentação)

1. Cadastre 2 ou 3 alimentos **sem estar logado**: ficam só no SQLite.
2. Na aba **Conta**, crie a conta e entre. Os itens sobem para o Supabase (confira em *Table Editor → itens*).
3. Ative o modo avião, cadastre outro item: o indicador mostra "Sem internet" / "pendente".
4. Desligue o modo avião: o item é enviado sozinho.
5. Edite um registro direto no Table Editor (atualize também `atualizado_em`) e puxe a lista: a mudança aparece no app.

### Testar a visão computacional (roteiro de apresentação)

1. **Novo alimento → Código:** aponte para o código de barras de um produto (ex.: leite condensado). Nome e categoria são
   preenchidos pela Open Food Facts.
2. **Ler data:** enquadre a validade impressa e tire a foto. A data aparece no campo com o aviso "lida da embalagem". Em
   embalagens com fabricação e validade, as duas datas aparecem como opções.
3. Salve e abra o alimento: o bloco **Lido pela câmera** mostra o código e o texto reconhecido.
4. No Supabase (*Table Editor → itens*), confira `codigo_barras`, `validade_origem = ocr` e `texto_ocr`.
5. Ative o modo avião e escaneie de novo o mesmo produto: ele é reconhecido pela despensa local, sem internet.
6. Veja o bloco **Cadastro pela câmera** na aba Resumo.
7. Digite "Iogurte" num novo alimento: o local muda para Geladeira e aparece a dica com o aviso "2 dias antes".
8. Em **Conta → Avisos de vencimento**, ligue as notificações, escolha o horário e toque em **Testar notificação**.

## 7. Próximos passos

- OCR no próprio aparelho (ML Kit) num build de desenvolvimento, para ler a validade sem internet.

## 8. Versão web (para apresentação)

O mesmo código roda no navegador. O SQLite funciona via WebAssembly, e o Supabase continua sincronizando. A câmera também
funciona no navegador (webcam ou câmera do celular), mas exige **HTTPS**: o Netlify já é HTTPS, e `localhost` também é aceito.

```bash
npx expo start --web              # testar no PC (abre em http://localhost:8081)
npm run build:web                 # gera a pasta dist/ pronta para o Netlify
```

O `build:web` também renomeia `dist/assets/node_modules` para `dist/assets/nm`, porque o Netlify ignora pastas com esse nome. A pasta `dist/` pode ser publicada no Netlify: arraste-a em https://app.netlify.com/drop. Os arquivos
`public/_headers` e `public/_redirects` já vão junto e ativam os cabeçalhos que o SQLite web exige
(`Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`).
