# design-sync: notas do TradeSpot

Projeto no Claude Design: "TradeSpot Design System" (`projectId` em `config.json`).

## Como este repositório vira um pacote

- O TradeSpot é um **app Vite, não uma biblioteca**: não existe `dist/` de componentes. O pacote do design system é montado a partir do código real de `src/`:
  - `.design-sync/ds/index.ts`: índice que só **reexporta** componentes de `src/`, sem nenhuma reimplementação. Para incluir ou tirar componentes, edite aqui.
  - `.design-sync/build-ds.mjs` (`cfg.buildCmd`): gera `.design-sync/.cache/dist/`. Os tipos saem pelo `tsc` (`tsconfig.ds.json`), o `index.mjs` pelo esbuild do projeto e o `styles.css` pelo Tailwind do projeto, mais o CSS importado pelos componentes (ex.: `toast.css`).
  - Esse `dist/` tem um `package.json` próprio (`@tradespot/ui`), e o conversor sobe até ele a partir de `cfg.entry`. Por isso os caminhos da config (`srcDir`, `tsconfig`, `cssEntry`, `extraFonts`) são **relativos a `.design-sync/.cache/dist/`**.
- **Antes do conversor, sempre rode `node .design-sync/build-ds.mjs`** quando `src/`, o índice ou as prévias mudarem. As prévias usam classes Tailwind, e o CSS só as inclui depois desse build.
- **esbuild com `packages: 'external'`.** Se as dependências forem embutidas com o React externo, todos os cartões quebram com `Dynamic require of "react" is not supported`: as dependências CommonJS chamam `require("react")` em tempo de execução. O conversor empacota as dependências ele mesmo.
- **Tailwind (`tailwind.ds.config.js`)** = tema do app + safelist das cores de token (`bg/text/border` × token × `''|/10|/20|/50` × `hover:`):
  - Sem a safelist, o agente usaria classes de token que o app nunca usou, e elas não existiriam no CSS.
  - No Tailwind 3, a safelist por regex **não** gera `/opacidade` nem `hover:` de forma confiável. Por isso ela é uma lista explícita.
  - A versão completa (todos os prefixos, opacidades e variantes) passava de 1,8 MB. Hoje o CSS tem ~124 KB.
- **Fonte:** Montserrat 400/500/600/700 copiada de `@fontsource/montserrat` para `.design-sync/fonts/` (licença OFL). O app carrega a mesma fonte do Google Fonts em `index.html`.
- **Apelidos fora dos cartões:** `componentSrcMap` exclui `TabsTrigger`, `TabsContent` e `TooltipContent`. São apelidos de `TabsTab`, `TabsPanel` e `TooltipPopup`, e continuam importáveis.
- **Ficaram fora do índice** os componentes que chamam a API, dependem de login ou de rotas: AppointmentForm, EditAppointmentForm, AttendantModal, ArchiveAttendantModal, EventModal, UnnichatConnectionModal, AppointmentOwnerField, ProfessionSelect, Sidebar, ProtectedRoute, ClientHistory, RankingModal, NotificationPrompt, UpdateNotification.
- **Ambiente:** Windows + Git Bash. O Playwright/Chromium fica em `.ds-sync/node_modules` + `%LOCALAPPDATA%\ms-playwright`; `npx playwright install chromium` dentro de `.ds-sync/`.

## Prévias

- Na primeira sincronização (2026-11-09), o usuário escolheu **cartões simples** para todos os componentes. Só `Input` e `CountUp` ganharam prévia escrita (`.design-sync/previews/`), porque a checagem marcava os dois como em branco. Escrever as demais prévias fica como oferta para as próximas sincronizações.
- `CountUp` usa `duration={1}` na prévia: com a duração padrão, a captura pega o "0" do início da animação.

## Avisos conhecidos da checagem visual

- `[TOKENS_MISSING]`: `--active-tab-*` (Base UI Tabs), `--toast-*`, `--tw-shadow-color` e `--tw` são variáveis definidas em tempo de execução. Esperado.
- `[RENDER_THIN]` em `Logo`, `LogoIcon`, `CustomPublicLogo` e `ExportIcon`: desenham em `currentColor`/cor clara, e o cartão simples parece vazio. Esperado.
- `[RENDER_THIN]` em `FloatingTextArea`, `TimePickerInput` e `TimePickerModal`: o cartão simples mostra só o rótulo com o nome. Esperado até alguém escrever as prévias.

## Riscos para a próxima sincronização

- **O índice é mantido à mão.** Componente novo em `src/` só entra se for adicionado em `.design-sync/ds/index.ts`.
- **A safelist do Tailwind é mantida à mão.** Um token novo em `tailwind.config.js` ou `src/index.css` precisa entrar na lista `colors` de `tailwind.ds.config.js`, e no cabeçalho `conventions.md`, se for relevante.
- **`buildCmd` depende de ferramentas do projeto:** `tsc`, `esbuild` (via Vite) e `tailwindcss` 3.4 do `node_modules` raiz. Atualizar o Tailwind para a v4 quebra `tailwind.ds.config.js`.
- **Os tipos das props do `Input`** saem sem os atributos nativos de `<input>` (`placeholder`, `value`…), que o extrator filtra. O componente aceita todos eles.
- **Prévias escritas:** foram verificadas só as duas de `Input` e `CountUp`. Os outros 40 componentes passaram apenas pela checagem de "monta sem erro".

## Como fazer a próxima sincronização (da raiz do repositório)

1. Recopie os scripts do skill para `.ds-sync/` e rode `npm i esbuild ts-morph @types/react playwright` dentro dela. Clone novo: rode também `npx playwright install chromium` e instale `@fontsource/montserrat`, se for regerar as fontes.
2. `node .design-sync/build-ds.mjs` (o `buildCmd`).
3. Baixe o `_ds_sync.json` do projeto para `.design-sync/.cache/remote-sync.json`.
4. `node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json`
