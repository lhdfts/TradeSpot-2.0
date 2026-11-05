# Revisão de Segurança — TradeSpot 2.0

**Data:** 27/10/2026
**Branch:** `dev`
**Escopo:** backend Express (`server/src`), frontend React (`src`), políticas Supabase (`supabase/*.sql`), configuração de deploy (`vercel.json`, CI), segredos e dados no repositório/histórico git, dependências npm.

> ⚠️ Este documento descreve vulnerabilidades e caminhos de exploração. Trate-o como interno: não publique nem compartilhe fora da equipe responsável.

## Metodologia

Revisão manual guiada pelas skills instaladas:

- **OWASP** (`owasp-security` — agamm/claude-code-owasp): Top 10:2025 / ASVS 5.0
- **Auditoria de código** (`auditing-code-for-vulnerabilities`, secskills): modelagem de ameaças, taint tracing, análise de variantes
- **Cadeia de suprimentos** (`supply-chain-risk-auditor`, Trail of Bits): `npm audit` e inspeção de lockfiles
- **Verificação** (`fp-check`): cada achado Crítico/Alto foi confirmado no código-fonte

Limitações:

- Os plugins Trail of Bits `static-analysis`, `insecure-defaults`, `variant-analysis`, `differential-review`, `sharp-edges` e `yara-authoring` **não estavam instalados**; foram usadas as skills equivalentes disponíveis. `yara-authoring` não se aplica a esta aplicação.
- `semgrep` e `snyk` CLI não estão instalados: não houve varredura automatizada SAST/SCA além do `npm audit`.
- O coletor do `supply-chain-risk-auditor` não rodou (sem Python/uv/gh); não foram avaliados mantenedores/abandono de pacotes.
- As correções foram validadas por `tsc --noEmit` (server) e `vite build` (frontend). **Não houve teste em execução**: validar em preview antes do deploy.

## Legenda de status

| Status | Significado |
|---|---|
| ✅ Corrigido | Correção aplicada no código/configuração |
| 🟦 Corrigido — requer ação | Correção pronta, mas depende de execução manual (ex.: SQL no Supabase) |
| 🟨 Parcial | Mitigado em parte; resta ação manual ou decisão |
| ⛔ Não corrigido | Fora do escopo desta rodada (decisão do time ou depende de terceiros) |

## Resumo

| Severidade | Total | ✅ | 🟦 | 🟨 | ⛔ |
|---|---|---|---|---|---|
| Crítica | 2 | 0 | 1 | 1 | 0 |
| Alta | 8 | 4 | 1 | 2 | 1 |
| Média | 10 | 7 | 0 | 1 | 2 |
| Baixa | 19 | 8 | 1 | 3 | 7 |
| **Total** | **39** | **19** | **3** | **7** | **10** |

---

## 🔴 Críticas

### C-01 — Supabase acessível pelo papel `anon` (leitura/escrita direta via PostgREST)
**Status:** 🟦 Corrigido — requer execução do SQL
**Local:** `supabase/rls_policies.sql:31-102`; `supabase/secure_rls_policies.sql:18-31`

`rls_policies.sql` cria políticas PERMISSIVE para `anon, authenticated`. Elas permitem:

- SELECT em `user`, `clients`, `appointments` e `events`;
- INSERT/UPDATE em `clients`, `appointments` e `events`;
- DELETE em `events`;
- UPDATE em `user`.

Os scripts "seguros" nunca removeram essas políticas: o `drop` está apenas comentado. Além disso, a política "Deny all" é PERMISSIVE e por isso não bloqueia nada, porque políticas permissivas são combinadas com OR.

O pentest de 22/05/2026 confirmou a leitura de 1000 agendamentos com nome, telefone e e-mail de clientes. Pelo SQL, um `PATCH /rest/v1/user` permitiria a qualquer pessoa se promover a Admin.

**Correção:**
- Criado `supabase/lockdown_anon_access.sql` (idempotente). O script:
  - remove todas as políticas aplicáveis a `anon`/`authenticated`/`public`;
  - habilita RLS em todas as tabelas;
  - revoga grants de tabelas, sequências e funções;
  - ajusta os default privileges.
- Os 4 scripts antigos foram marcados como "OBSOLETO — NÃO EXECUTE".
- O backend usa a secret key (bypass de RLS) e não é afetado.
- O fallback para a chave anon foi removido de `server/src/utils/supabaseClient.ts`.
- As chaves legadas (anon/service_role JWT) já estão desabilitadas no painel do Supabase.

**Pendente:**
- Executar o script no SQL Editor e rodar as consultas de verificação ao final do arquivo.
- A publishable key nova também opera como `anon`, por isso o script é necessário mesmo com as chaves legadas desabilitadas.

### C-02 — Token Bearer da Unnichat versionado no repositório
**Status:** 🟨 Parcial
**Local:** `JSON to document/*.json`; `docs/workflow-lembretes-agendamento.md`; `docs/workflow-receber-novo-agendamento.md`; histórico git (commits `41ca283`, `7c59d62`, `59f7f5e`)

O token dá leitura e escrita nos contatos/leads do WhatsApp via `unnichat.com.br/api/contact/*`.

**Correção aplicada:**
- Token substituído por `<UNNICHAT_API_TOKEN>` nos docs.
- `JSON to document/` removido do índice git e adicionado ao `.gitignore`. Os arquivos continuam no disco.

**Pendente:**
- Rotacionar o token na Unnichat.
- Usar Credential no n8n em vez de header literal.
- Limpar o histórico com `git filter-repo --replace-text` e fazer force-push.

---

## 🟠 Altas

### A-01 — Líder pode se promover a Admin/Dev e alterar/excluir qualquer usuário
**Status:** ✅ Corrigido
**Local:** `server/src/routes/appointmentRoutes.ts` — `PUT/POST/DELETE /attendants`

`role` e `sector` vinham do body sem lista de cargos permitidos nem checagem de alvo.

**Correção:** helpers `checkAttendantChange` e `loadAttendantForChange`. As regras agora são:

- ninguém altera o próprio cargo;
- só Dev atribui Dev;
- Líder só atribui Colaborador, Qualidade, Co-líder ou Líder;
- Líder não edita nem exclui Admin/Dev;
- Líder só atua no próprio setor, com exceção de "Sem setor" para onboarding;
- ninguém exclui a si mesmo.

### A-02 — IDOR em `PUT /api/appointments/:id` e falsificação de `updatedBy`
**Status:** ✅ Corrigido
**Local:** `server/src/routes/appointmentRoutes.ts` — `PUT /:id`

Qualquer usuário autenticado alterava ou cancelava qualquer agendamento. `updatedBy` vinha do body, o que permitia burlar o limite de 3 edições de status do Closer e falsificar a auditoria.

**Correção:**
- Helper `canAccessAppointment(user, appt)` com a mesma regra de visibilidade do GET; fora do escopo a resposta é 404.
- `updatedBy` agora é sempre `req.user.id`.
- O limite de edições passou a usar o cargo e o setor reais do usuário.

### A-03 — Rota pública sobrescreve dados de cliente existente sabendo só o telefone
**Status:** ✅ Corrigido
**Local:** `server/src/routes/publicRoutes.ts` — `POST /api/public/appointments`

Quem soubesse o telefone trocava o nome e o e-mail do cliente (desviando convites do Meet e fluxos n8n) e zerava os dados de CRM.

**Correção:** um cliente existente não é mais sobrescrito; apenas campos vazios/nulos são preenchidos. O payload dos webhooks não mudou.

### A-04 — Qualquer conta Firebase do projeto era aceita e cadastrada automaticamente
**Status:** ✅ Corrigido
**Local:** `server/src/middleware/firebaseAuth.ts`; `server/src/routes/authRoutes.ts`

O backend não validava `sign_in_provider`. Se Email/Senha ou Google estivessem habilitados no Firebase, qualquer pessoa entraria como Colaborador, ou herdaria o cargo de um usuário pré-cadastrado que nunca logou.

**Correção:**
- `sessionLogin` e `verifyFirebaseToken` exigem o provedor SAML do Workspace (`saml.sistema-depositos-google-workspace`).
- O provedor é configurável via a variável de ambiente `ALLOWED_SIGN_IN_PROVIDERS`.

**Recomendado:** desabilitar os demais provedores no console do Firebase.

### A-05 — Tabelas sem RLS: `execution_logs`, `activity_logs`, `unnichat_connections`
**Status:** 🟦 Corrigido — requer execução do SQL

Nenhum script do repositório habilitava RLS nessas tabelas. `unnichat_connections.unnichat_url` contém URLs de integração.

**Correção:** coberto por `supabase/lockdown_anon_access.sql`, que habilita RLS em todas as tabelas do schema `public`.

### A-06 — URLs de webhook do n8n versionadas
**Status:** ⛔ Não corrigido (decisão do time: risco operacional de interromper as automações)
**Local:** `server/src/config/webhooks.ts` (fallbacks hardcoded); `docs/WEBHOOK_GLOBAL_N8N.md`; `docs/workflow-*.md`; histórico git

O UUID da URL funciona como segredo: quem tem a URL dispara workflows (mensagens a clientes, criação de agendamentos).

**Recomendado quando possível:**
- Exigir Header Auth/HMAC nos nós Webhook do n8n.
- Regenerar as URLs.
- Remover os fallbacks do código.
- Limpar o histórico.

### A-07 — Dados reais de clientes e funcionários versionados (LGPD)
**Status:** 🟨 Parcial

Arquivos afetados:

- `appointments.json`: 149 agendamentos, com links do Meet, notas e valores.
- `2026-01-15.txt`
- `debug_output.txt`
- `agendamento duplicados.json`
- `JSON to document/Receber Novo Agendamento.json`
- Apenas no histórico: `Closers and Schedules.json` e `today.json`.

**Correção aplicada:** arquivos removidos do índice git (mantidos no disco) e adicionados ao `.gitignore`.

**Pendente:**
- Limpar o histórico (`git filter-repo`) e fazer force-push em todas as branches.
- Avaliar com o DPO se o repositório foi compartilhado.

### A-08 — Dependências vulneráveis
**Status:** 🟨 Parcial

| Escopo | Antes | Depois |
|---|---|---|
| Raiz | 47 (3 críticas, 26 altas, 16 moderadas, 2 baixas) | 11 (4 altas, 7 moderadas) |
| `server/` | 30 (4 críticas, 12 altas, 12 moderadas, 2 baixas) | 7 (moderadas) |

Corrigidas, entre outras: `protobufjs`, `proxy-addr`, `axios`, `express-rate-limit`, `zod`, `react-router` e `path-to-regexp`.

**Restantes:**
- Exigem atualização major:
  - `firebase-admin` 14.x corrige `google-gax`, `uuid` e `@google-cloud/*`.
  - Para o `firebase` (client), o npm sugere um downgrade inválido (9.14).
- O alerta do client vem de `@firebase/firestore`/`grpc-js`, e o Firestore não é usado pelo app.

**Pendente:** atualizar `firebase-admin` para 14.x com testes.

---

## 🟡 Médias

### M-01 — Falsificação de criador/owner (comissão) em `POST /api/appointments`
**Status:** ✅ Corrigido

`created_by`, `owner` e o convidado do Meet agora vêm sempre de `req.user.id`.

### M-02 — Data `DD/MM/YYYY` burlava a antecedência mínima e era gravada trocada (MDY)
**Status:** ✅ Corrigido
**Local:** `server/src/schemas/appointmentSchema.ts`; `server/src/utils/dateInput.ts` (novo); `publicRoutes.ts`

- O schema público aceita apenas ISO com data de calendário válida.
- O schema interno normaliza `DD/MM/YYYY` para ISO.
- A rota pública rejeita data inválida (`Number.isFinite`) e datas a mais de 180 dias.

### M-03 — `GET /api/public/events/feeds` público expunha todos os eventos
**Status:** ✅ Corrigido

A rota exibia eventos de qualquer setor, inclusive inativos, do CEO e com `unnichat_url`. Agora exige autenticação; o único consumidor é o painel interno.

### M-04 — `POST` público aceitava qualquer `eventId`, inclusive de eventos inativos/internos
**Status:** ✅ Corrigido

`eventId` precisa ser UUID, e o evento precisa estar ativo e ter `self_scheduling_link`.

### M-05 — Path traversal no proxy do Pipedrive
**Status:** ✅ Corrigido
**Local:** `server/src/routes/pipedriveRoutes.ts` — `/persons/:id/deals`

O `id` agora é validado com `/^\d+$/`. A query `status`/`limit`/`start` passa por `PersonDealsQuerySchema` (Zod).

### M-06 — Líder alterava eventos e conexões Unnichat de outros setores; `unnichat_url` exposto
**Status:** ✅ Corrigido
**Local:** `appointmentRoutes.ts` (eventos e conexões); `unnichatRoutes.ts`

- Líder fora do TEI só atua no próprio setor e não move registros entre setores.
- `unnichat_url` é omitido para quem não é gestor.

### M-07 — Rate limiting fraco
**Status:** 🟨 Parcial

**Correção:** `/api/public/available-times` passou a ter limite de 60 requisições/min por IP.

**Pendente:**
- O store é em memória, por instância da Vercel. Usar store compartilhado (Upstash/Redis).
- Adicionar CAPTCHA (Turnstile) no `POST` público.

### M-08 — Token do Pipedrive exposto em bundles antigos / prefixo `VITE_`
**Status:** ⛔ Não corrigido (rotação adiada)

O commit `5afca67` removeu o token do bundle, mas ele ficou exposto em deploys anteriores. O backend já lê `PIPEDRIVE_API_TOKEN` primeiro.

**Pendente:**
- Rotacionar o token.
- Renomear a variável para `PIPEDRIVE_API_TOKEN` (sem `VITE_`) no `.env` e na Vercel.

### M-09 — Dados pessoais acessíveis a qualquer autenticado
**Status:** ✅ Corrigido

- `/clients/email/:email` e `/clients/phone/:phone` retornam apenas os campos usados pelos formulários.
- `GET /attendants` não retorna e-mail para quem não é gestor.

### M-10 — Signup do Supabase Auth possivelmente aberto
**Status:** ⛔ Não verificado

Se o Supabase Auth estiver habilitado com signup aberto, qualquer pessoa obtém um JWT `authenticated`. O risco é mitigado pelo C-01: após o lockdown, `authenticated` não tem acesso.

**Pendente:** desabilitar o signup no painel do Supabase.

---

## ⚪ Baixas

| ID | Achado | Status | Observação |
|---|---|---|---|
| B-01 | `is_sector_leader` é SECURITY DEFINER sem `search_path` e executável por anon (oráculo de cargo) | 🟦 Requer SQL | Coberto por `lockdown_anon_access.sql` |
| B-02 | CSP liberava `*.supabase.co` e `api.pipedrive.com` sem uso; faltavam HSTS, Permissions-Policy, `object-src`, `base-uri` e `form-action`; havia `X-Powered-By` | ✅ Corrigido | `style-src 'unsafe-inline'` permanece |
| B-03 | CORS aceitava qualquer `tradespot*.vercel.app` com `credentials:true` | ✅ Corrigido | Agora aceita lista fixa, a URL do próprio deploy e o escopo `lhdfs-projects`, configurável via `CORS_VERCEL_SCOPE` |
| B-04 | `err.message` vazava em respostas de erro | ✅ Corrigido | Respostas genéricas: "Erro Interno" |
| B-05 | IP de auditoria vinha do 1º valor de `X-Forwarded-For` (forjável) | ✅ Corrigido | Usa `req.ip` |
| B-06 | Logout não revogava o token (cookie roubado válido por até 24h) | ✅ Corrigido | `revokeRefreshTokens`; o logout encerra a sessão em todos os dispositivos |
| B-07 | `sessionLogin` sem proteção contra login CSRF e sem checagem de `auth_time` | ⛔ Não corrigido | Mitigado pela restrição de provedor (A-04) |
| B-08 | `limit` sem teto em `/execution-logs` | ✅ Corrigido | Entre 1 e 500 |
| B-09 | Convites do Google Calendar para e-mails arbitrários expõem e-mails internos | 🟨 Parcial | `guestsCanSeeOtherGuests: false` e `guestsCanInviteOthers: false`; o envio para e-mail arbitrário continua |
| B-10 | Oráculo de enumeração por telefone (409 "agendamento pendente") | ⛔ Não corrigido | Mantido por UX; protegido pelo rate limit de 6/h |
| B-11 | Whitelist do evento restrito usa e-mails não verificados, hardcoded no código | ⛔ Não corrigido | Mover para o banco e verificar posse do e-mail |
| B-12 | Condição de corrida em "1 pendente por telefone" e no limite de concorrência do CS | ⛔ Não corrigido | Índice único parcial ou RPC transacional |
| B-13 | `rescheduleLastNoShow` acionável por quem conhece o telefone | ⛔ Não corrigido | Exige criar um agendamento real; impacto baixo |
| B-14 | `.gitignore` não cobria `.env.*`, `*.pem` nem `refresh_token.txt` | ✅ Corrigido | |
| B-15 | Relatório de pentest, script de debug com e-mail de cliente, `tmp/`, logs versionados | 🟨 Parcial | Removidos do índice; histórico pendente |
| B-16 | Workflow de CI: actions por tag, sem `permissions` | 🟨 Parcial | Adicionado `permissions: contents: read`; falta pin por SHA. O workflow está inativo (dispara em `main`, a branch padrão é `master`) |
| B-17 | `.npmrc` com `legacy-peer-deps=true` | ⛔ Não corrigido | Remover pode quebrar o install (peer deps do React 19) |
| B-18 | `SUPABASE_RLS_DOCUMENTATION.md` descreve um modelo de RLS que não corresponde aos scripts | ✅ Mitigado | Os scripts foram marcados como obsoletos; atualizar o documento quando o lockdown for aplicado |
| B-19 | Webhooks de saída enviados sem autenticação para o n8n | ⛔ Não corrigido | Ver A-06 |

---

## Pontos de atenção introduzidos pelas correções

- **Medina (`isMedinaUser`):** se for Líder, perde a edição de atendentes, eventos e conexões do Customer Success, porque o backend só considera o setor principal (mesmo comportamento que já existia no arquivamento). Decidir se a exceção deve ser replicada no backend.
- **Líder atribuindo "Qualidade":** continua permitido, porque a interface oferece essa opção, mas Qualidade tem visão global. Na prática é uma escalada de privilégio que vale reavaliar.
- **Domínio de produção:** o CORS aceita `https://tradespot-ts.vercel.app`. Qualquer outro domínio de produção precisa ser incluído em `server/src/server.ts`.
- **Agendamento público:** datas a mais de 180 dias passam a ser recusadas, mas o calendário público não limita essa janela.
- **Login:** qualquer provedor diferente do SAML do Workspace passa a ser rejeitado.

## Verificado sem problemas

- **XSS:** não há `dangerouslySetInnerHTML`, `innerHTML` nem `eval` em `src/`.
- **Sessão:** cookie HttpOnly/Secure/SameSite=Lax; `verifySessionCookie` com checagem de revogação; Firebase em `inMemoryPersistence`.
- **Cargo e setor:** lidos do banco a cada requisição, nunca do cliente.
- **Integrações:** `integrationAuth` usa comparação timing-safe e falha fechada.
- **PostgREST:** sem injeção de filtro (`.or()` só recebe IDs vindos do banco).
- **Agendamento duplo:** a constraint `no_double_booking_per_attendant` impede duplicidade por atendente.
- **Build:** sem sourcemaps em produção; o bundle não contém segredos de servidor.
- **Histórico git:** nenhum `.env`, chave privada, JWT ou service account commitado.
- **Lockfiles:** todos os pacotes resolvem para `registry.npmjs.org`.

## Próximos passos (por prioridade)

1. Executar `supabase/lockdown_anon_access.sql` e rodar as consultas de verificação.
2. Validar a branch `dev` em preview (login, agendamento público, edição de agendamentos, gestão de atendentes) e então fazer o deploy.
3. Rotacionar o token da Unnichat e o token do Pipedrive.
4. Desabilitar provedores extras no Firebase e o signup do Supabase Auth.
5. Limpar o histórico git (`git filter-repo`) e fazer force-push.
6. Adicionar autenticação nos webhooks do n8n (A-06).
7. Atualizar `firebase-admin` para 14.x.
8. Usar store compartilhado no rate limit e CAPTCHA no agendamento público.
