# Guia Completo: Adicionar Novo Evento no TradeSpot 2.0

## Visão Geral

Este documento fornece um guia passo a passo completo para adicionar um novo evento ao sistema TradeSpot 2.0 e atualizar todas as automações n8n relacionadas.

Quando um novo evento é criado no sistema, é necessário atualizar até **4 workflows n8n diferentes** para garantir que as automações funcionem corretamente para este evento.

---

## Sumário

1. [Passo 1: Criar Evento no Sistema](#passo-1-criar-evento-no-sistema)
2. [Passo 2: Configurar Conexões UnniChat](#passo-2-configurar-conexões-unnichat)
3. [Passo 3: Atualizar Workflows n8n](#passo-3-atualizar-workflows-n8n)
4. [Passo 4: Testes e Validação](#passo-4-testes-e-validação)
5. [Checklist de Implementação](#checklist-de-implementação)
6. [Troubleshooting](#troubleshooting)

---

## Passo 1: Criar Evento no Sistema

### 1.1 Acessar a Tela de Eventos

1. Faça login no TradeSpot 2.0
2. No menu lateral, clique em **"Eventos"**
3. Você verá a lista de todos os eventos cadastrados

### 1.2 Criar Novo Evento

1. Clique no botão **"+ Novo Evento"** (canto superior direito)
2. Um modal será aberto com o formulário de criação

### 1.3 Preencher Informações do Evento

**Campos obrigatórios:**

#### Nome do Evento
- **Campo**: Nome do Evento
- **Formato**: Código - Nome descritivo
- **Exemplo**: `0126 - Cash Express`
- **Convenção de nomenclatura**:
  - Comece com código numérico (ex: 0126, 1125)
  - Use hífen para separar código do nome
  - Use nomes descritivos e claros
  - Evite caracteres especiais além do hífen
  
**IMPORTANTE**: O nome do evento será usado nas condições dos workflows n8n. Deve ser único e exatamente igual ao que será configurado nas automações.

#### Setor
- **Campo**: Setor
- **Opções disponíveis**:
  - Aldeia
  - Closer
  - SDR
  - Tribo
  - Social Seller

**Nota sobre permissões**:
- Usuários comuns: O setor é preenchido automaticamente com o setor do usuário (não editável)
- Admin/Dev/Qualidade/TEI/Suporte: Podem escolher qualquer setor

**IMPORTANTE**: O setor determina:
- Quem pode ver o evento na criação de agendamentos
- Qual fluxo de atualização será seguido no workflow de atualização

#### Status
- **Campo**: Status
- **Opções**:
  - **Ativo**: Evento aparece nas opções de agendamento
  - **Arquivado**: Evento não aparece, mas mantém histórico

### 1.4 Salvar o Evento

1. Clique em **"Salvar"**
2. O evento será criado no banco de dados com:
   - ID único (UUID gerado automaticamente)
   - Data/hora de início (atual)
   - Data/hora de término (1 hora depois)
   - Status ativo por padrão

### 1.5 Verificar Criação

1. O modal se fechará
2. A lista de eventos será atualizada automaticamente
3. Você verá o novo evento na tabela
4. Verifique se:
   - Nome está correto
   - Setor está correto
   - Status está "Ativo"

---

## Passo 2: Configurar Conexões UnniChat

Antes de atualizar os workflows, você precisa criar as conexões no UnniChat para o novo evento.

### 2.1 Determinar Quais Conexões São Necessárias

Baseado no tipo de evento, você precisará criar conexões para:

**Para eventos de SDR/Social Seller:**
- Conexão para recebimento de novo agendamento
- Conexão para lembrete 2h antes
- Conexão para lembrete 10min antes
- Conexão para atualização de status

**Para eventos de Closer:**
- Conexão para recebimento de novo agendamento
- Conexão para lembrete 2h antes
- Conexão para lembrete 10min antes
- Conexão para atualização de status

**Para eventos de Aldeia:**
- Conexão para recebimento de novo agendamento
- Conexão para atualização de status

### 2.2 Criar Conexões no UnniChat

1. Acesse o painel do UnniChat: `https://unnichat.com.br`
2. Faça login com suas credenciais
3. Navegue até **Automações** → **Conexões**
4. Para cada tipo de mensagem, crie uma nova conexão:

#### Conexão: Recebimento de Novo Agendamento

**Quando criar**: Sempre que um novo agendamento deste evento for criado

**Informações a configurar**:
- Nome: `[Nome do Evento] - Novo Agendamento`
- Tipo: WhatsApp/Instagram (conforme aplicável)
- Mensagem template com variáveis:
  - `{{nome}}` - Nome do lead
  - `{{telefone}}` - Telefone do lead
  - `{{email}}` - Email do lead
  - `{{atendente}}` - Nome do atendente
  - `{{created_by}}` - Quem criou o agendamento
  - `{{evento}}` - Nome do evento
  - `{{meet_link}}` - Link do Google Meet
  - `{{data_hora}}` - Data e hora formatada
  - `{{tipo}}` - Tipo do agendamento

**Exemplo de mensagem**:
```
Olá {{nome}}! 🎉

Seu agendamento foi confirmado!

📅 Data/Hora: {{data_hora}}
👤 Atendente: {{atendente}}
🎯 Evento: {{evento}}
🔗 Link do Meet: {{meet_link}}

Até lá! 🚀
```

**Anotar**: ID da conexão (será usado no workflow)

---

#### Conexão: Lembrete 2h Antes

**Quando criar**: 2 horas antes do horário do agendamento

**Informações a configurar**:
- Nome: `[Nome do Evento] - Lembrete 2h`
- Mensagem template com variáveis:
  - `{{nome}}` - Nome do lead
  - `{{telefone}}` - Telefone do lead
  - `{{data_agendamento}}` - Horário do agendamento

**Exemplo de mensagem**:
```
Olá {{nome}}! ⏰

Lembrete: Seu agendamento está marcado para daqui a 2 horas!

🕐 Horário: {{data_agendamento}}

Prepare-se! Até logo! 🎯
```

**Anotar**: ID da conexão

---

#### Conexão: Lembrete 10min Antes

**Quando criar**: 10 minutos antes do horário do agendamento

**Informações a configurar**:
- Nome: `[Nome do Evento] - Lembrete 10min`
- Mensagem template com variáveis:
  - `{{telefone}}` - Telefone do lead
  - `{{meet_link}}` - Link do Google Meet
  - `{{negociando}}` - Nome do atendente

**Exemplo de mensagem**:
```
⚡ ÚLTIMO LEMBRETE ⚡

Seu agendamento começa em 10 minutos!

👤 Atendente: {{negociando}}
🔗 Acesse agora: {{meet_link}}

Estamos te esperando! 🎯
```

**Anotar**: ID da conexão

---

#### Conexão: Atualização de Status

**Quando criar**: Quando o status do agendamento é alterado

**Informações a configurar**:
- Nome: `[Nome do Evento] - Atualização`
- Mensagem template com variáveis:
  - `{{telefone}}` - Telefone do lead
  - `{{status}}` - Novo status do agendamento
  - `{{atendente}}` - Nome do atendente
  - `{{tipo}}` - Tipo do agendamento (para SDR)

**Exemplo de mensagem**:
```
Olá! Há uma atualização no seu agendamento.

📊 Status: {{status}}
👤 Atendente: {{atendente}}

Qualquer dúvida, estamos à disposição! ✨
```

**Anotar**: ID da conexão

### 2.3 Registrar IDs das Conexões

Crie uma tabela de referência com todos os IDs:

```markdown
## Evento: [Nome do Evento]

| Tipo de Conexão | ID da Conexão | URL Completa |
|----------------|---------------|--------------|
| Novo Agendamento | xxxxxxxxxxxxxxx | https://unnichat.com.br/a/start/xxxxxxxxxxxxxxx |
| Lembrete 2h | yyyyyyyyyyyyyyy | https://unnichat.com.br/a/start/yyyyyyyyyyyyyyy |
| Lembrete 10min | zzzzzzzzzzzzzzz | https://unnichat.com.br/a/start/zzzzzzzzzzzzzzz |
| Atualização | wwwwwwwwwwwwwww | https://unnichat.com.br/a/start/wwwwwwwwwwwwwww |
```

---

## Passo 3: Atualizar Workflows n8n

Agora você precisa atualizar os workflows n8n para incluir o novo evento.

### 3.1 Workflow: Receber Novo Agendamento

**Arquivo**: `Receber Novo Agendamento.json`

**Quando atualizar**: SEMPRE que criar um novo evento

#### Identificar o Tipo de Agendamento

Primeiro, identifique qual tipo de agendamento este evento pertence:
- Ligação Closer
- Ligação SDR
- Upgrade
- Reagendamento Closer
- Agendamento Pessoal

#### Passos para Atualizar

1. **Acessar n8n**
   - URL: `https://n8n.tradestars.com.br`
   - Faça login

2. **Abrir o Workflow**
   - Workflows → Receber Novo Agendamento
   - ID: `4XpnERxEm9VytY2r`

3. **Localizar o Webhook Correto**
   - Encontre o webhook do tipo de agendamento correspondente
   - Exemplo: Para Ligação Closer, encontre o webhook `fef2183b-d765-40f0-9841-eac5e368cedc`

4. **Adicionar Nova Condição**
   
   **Se o evento for tipo Instagram (Social Seller Instagram):**
   
   a. Localize o nó `Instagram` (tipo IF)
   
   b. Abra as configurações do nó
   
   c. Na estrutura atual, a condição é:
   ```
   evento === "0126 - Social Seller (Instagram)"
   ```
   
   d. **NÃO ALTERAR** - Este nó está correto para Instagram
   
   e. Para um novo evento Instagram, você precisará criar um novo IF ou Switch

   **Se o evento for tipo WhatsApp (Social Seller WhatsApp):**
   
   a. Localize o nó `0126 - Social Seller (WhatsApp)` (tipo IF)
   
   b. Abra as configurações do nó
   
   c. Condição atual:
   ```
   evento === "0126 - Social Seller (WhatsApp)"
   ```
   
   d. **NÃO ALTERAR** - Crie um novo IF para o novo evento

   **Se o evento for tipo On The Road:**
   
   a. Localize o nó `0126 - On The Road 2.0` (tipo IF)
   
   b. Condição atual:
   ```
   evento === "0126 - On The Road 2.0"
   ```
   
   c. **NÃO ALTERAR** - Crie um novo IF para o novo evento

   **Se o evento for tipo Agendamento Direto Closer:**
   
   a. Localize o nó `Agendamento Direto Closer` (tipo IF)
   
   b. Condição atual:
   ```
   evento === "Agendamento Lead Closer"
   ```
   
   c. Para adicionar mais eventos neste fluxo, altere para OR:
   ```
   evento === "Agendamento Lead Closer" OR evento === "[Novo Evento]"
   ```

5. **Criar Nó de Envio para Conexão**

   a. Adicione um novo nó `HTTP Request`
   
   b. Configure:
   - **Nome**: `Enviar para "[Nome do Evento]"`
   - **Method**: POST
   - **URL**: `https://unnichat.com.br/a/start/[ID_DA_CONEXAO]`
   - **Send Body**: true
   
   c. **Body Parameters**:
   ```json
   {
     "nome": "={{ $json.nome }}",
     "telefone": "={{ $json.telefone }}",
     "email": "={{ $json.email }}",
     "atendente": "={{ $json.atendente }}",
     "created_by": "={{ $json.created_by }}",
     "evento": "={{ $json.evento }}",
     "meet_link": "={{ $json.meet_link }}",
     "data_hora": "={{ $json.data_hora }}",
     "tipo": "={{ $json.tipo }}"
   }
   ```

6. **Conectar os Nós**
   - Conecte o IF do seu evento ao nó HTTP Request criado

7. **Salvar o Workflow**
   - Clique em "Save"
   - Teste com um agendamento de exemplo

#### Exemplo Prático: Adicionar Evento "0127 - Imersão Alpha"

**Cenário**: Evento do setor SDR, deve enviar notificação igual ao fluxo padrão SDR

**Passos**:

1. Abrir workflow "Receber Novo Agendamento"
2. Localizar o webhook de "Ligação SDR" (`a28b6ded-a788-4ccb-b4e1-7a526340dcba`)
3. Após o nó `Edit Fields1`, o fluxo vai para `Enviar para Conexão "SDR"`
4. Você tem duas opções:

   **Opção A: Usar a mesma conexão SDR existente**
   - Não precisa alterar nada
   - O evento já será enviado automaticamente

   **Opção B: Criar conexão específica para este evento**
   - Adicionar um novo nó IF após `Edit Fields1`
   - Condição: `evento === "0127 - Imersão Alpha"`
   - TRUE: Criar novo HTTP Request com ID da nova conexão
   - FALSE: Enviar para conexão SDR padrão

---

### 3.2 Workflow: Atualização de Agendamento

**Arquivo**: `Atualização de Agendamento (1).json`

**Quando atualizar**: SEMPRE que criar um novo evento que precise notificar sobre mudanças de status

#### Passos para Atualizar

1. **Acessar n8n**
   - Workflows → Atualização de Agendamento
   - ID: `aYJcIwmXGfcIRxXl`

2. **Entender a Estrutura**
   
   Este workflow tem uma estrutura de decisão em cascata:
   
   - Nível 1: Verifica se é "Agendamento Lead Closer"
   - Nível 2: Verifica se é "Social Seller" (Instagram ou WhatsApp)
   - Nível 3: Verifica setor do criador (SDR, Closer, Aldeia)

3. **Determinar Onde Adicionar o Evento**

   **Se o evento for "Lead Closer":**
   
   a. Localize o nó `If` (primeiro nó de decisão)
   
   b. Abra as configurações
   
   c. Condição atual:
   ```
   evento === "Agendamento Lead Closer"
   ```
   
   d. Altere para incluir o novo evento:
   ```
   evento === "Agendamento Lead Closer" OR evento === "[Novo Evento]"
   ```
   
   e. Salve

   **Se o evento for "Social Seller":**
   
   a. Localize o nó `Social Seller` (tipo Switch)
   
   b. Abra as configurações
   
   c. Você verá 3 opções:
      - Instagram - Social Seller
      - WhatsApp - Social Seller
      - Não é
   
   d. Para adicionar novo evento Social Seller:
   
   - Clique em "Add Routing Rule"
   - Nome da saída: `[Nome do Evento]`
   - Condição: `evento === "[Nome Exato do Evento]"`
   
   e. Conecte a saída a um novo nó HTTP Request ou a uma conexão existente

   **Se o evento segue o fluxo padrão por setor:**
   
   - Não precisa alterar nada
   - O Switch por setor (`creator_sector`) já cuida do roteamento

4. **Adicionar Conexão de Atualização (se necessário)**

   Se o evento precisar de uma conexão específica de atualização:
   
   a. Adicione um novo nó `HTTP Request`
   
   b. Configure:
   - **Nome**: `Enviar Atualização "[Nome do Evento]"`
   - **Method**: POST
   - **URL**: `https://unnichat.com.br/a/start/[ID_CONEXAO_ATUALIZACAO]`
   - **Send Body**: true
   
   c. **Body Parameters**:
   ```json
   {
     "telefone": "={{ $node[\"Edit Fields\"].json[\"telefone\"] }}",
     "status": "={{ $node[\"Edit Fields\"].json[\"status\"] }}",
     "atendente": "={{ $node[\"Edit Fields\"].json[\"atendente\"] }}",
     "tipo": "={{ $node[\"Edit Fields\"].json[\"tipo\"] }}"
   }
   ```

5. **Salvar e Testar**

#### Exemplo Prático: Adicionar Evento "0127 - Imersão Alpha"

**Cenário**: Evento do setor SDR, deve notificar sobre atualizações

**Passos**:

1. Abrir workflow "Atualização de Agendamento"
2. Como é evento de SDR e não é "Social Seller", ele cairá no Switch por setor
3. Se o criador for do setor SDR:
   - Enviará para conexão SDR
   - Depois enviará para conexão Closer
4. **Não precisa alterar nada** - o roteamento por setor já funciona

**Se quiser conexão específica**:

1. Após o nó `Edit Fields`, adicionar novo IF
2. Condição: `evento === "0127 - Imersão Alpha"`
3. TRUE: Enviar para conexão específica do evento
4. FALSE: Seguir para o Switch "Social Seller" existente

---

### 3.3 Workflow: 2h Antes do Agendamento

**Arquivo**: `2h antes do agendamento (2).json`

**Quando atualizar**: Se o evento precisar de lembrete 2h antes

#### Passos para Atualizar

1. **Acessar n8n**
   - Workflows → 2h antes do agendamento
   - ID: `so5zdjc3QLJP49Qh`

2. **Entender o Fluxo**
   
   - Cron executa a cada 15 minutos
   - Query SQL busca agendamentos pendentes 2h no futuro
   - Switch `Eventos` roteia baseado no nome do evento

3. **Localizar o Switch "Eventos"**
   
   - Este nó tem 7 saídas configuradas:
     1. 0126 - Protocolo Antissistema
     2. 0126 - Social Seller (Instagram)
     3. 0126 - Social Seller (WhatsApp)
     4. 0126 - On The Road 2.0
     5. 0126 - Área 80/20
     6. Agendamento Lead Closer
     7. Pausa Extra

4. **Adicionar Nova Regra de Roteamento**

   a. Clique no nó `Eventos`
   
   b. Abra as configurações
   
   c. Role até o final das regras existentes
   
   d. Clique em **"Add Routing Rule"**
   
   e. Configure a nova regra:
   
   **Output Key (Nome da saída)**:
   ```
   [Nome do Evento]
   ```
   
   **Condições**:
   ```
   $('Edit Fields').item.json.event === "[Nome Exato do Evento]"
   ```
   
   f. Clique em "Add Condition" se precisar de condições adicionais

5. **Criar Nó de Envio**

   a. Adicione um novo nó `HTTP Request` fora do Switch
   
   b. Configure:
   - **Nome**: `Enviar Lembrete 2h "[Nome do Evento]"`
   - **Method**: POST
   - **URL**: `https://unnichat.com.br/a/start/[ID_CONEXAO_2H]`
   - **Send Body**: true
   
   c. **Body Parameters**:
   ```json
   {
     "telefone": "={{ $json.telefone }}",
     "data_agendamento": "={{ $json.horario_agendamento }}",
     "nome": "={{ $json.nome }}"
   }
   ```
   
   **OU** se for tipo Instagram (precisa de integração UnniChat):
   
   ```json
   {
     "email": "={{ $json.clientEmail }}"
   }
   ```
   
   E depois adicionar nós de:
   - Pesquisar Lead
   - Adicionar Tag
   - Preencher Campo Personalizado

6. **Conectar ao Switch**
   
   - Conecte a saída do Switch (com o nome do seu evento) ao nó HTTP Request criado

7. **Configurar Retorno ao Loop**
   
   - Do nó HTTP Request, conecte de volta ao nó `Loop Over Items`
   - Isso permite processar o próximo agendamento

8. **Salvar**

#### Exemplo Prático: Adicionar Evento "0127 - Imersão Alpha"

**Cenário**: Evento SDR que deve enviar lembrete 2h antes via WhatsApp

**Passos**:

1. Abrir workflow "2h antes do agendamento"
2. Clicar no nó `Eventos` (Switch)
3. Adicionar nova regra:
   - **Output Key**: `0127 - Imersão Alpha`
   - **Condição**: `$('Edit Fields').item.json.event === "0127 - Imersão Alpha"`
4. Adicionar novo nó HTTP Request:
   - **Nome**: `Enviar para "Imersão Alpha - 2h"`
   - **URL**: `https://unnichat.com.br/a/start/[ID_CONEXAO]`
   - **Body**:
     ```json
     {
       "telefone": "={{ $json.telefone }}",
       "data_agendamento": "={{ $json.horario_agendamento }}",
       "nome": "={{ $json.nome }}"
     }
     ```
5. Conectar saída do Switch ao novo HTTP Request
6. Conectar HTTP Request de volta ao Loop
7. Salvar

**Resultado**: Agendamentos deste evento receberão lembrete 2h antes

---

### 3.4 Workflow: 10min Antes do Agendamento

**Arquivo**: `10min antes do agendamento (2).json`

**Quando atualizar**: Se o evento precisar de lembrete 10min antes

#### Passos para Atualizar

1. **Acessar n8n**
   - Workflows → 10min antes do agendamento
   - ID: `q31Z9geOXPMYQDlE`

2. **Entender o Fluxo**
   
   - Cron executa a cada 15 minutos (deslocado 5min do workflow 2h)
   - Query SQL busca agendamentos pendentes 10min no futuro
   - Switch `Eventos` roteia baseado no nome do evento

3. **Localizar o Switch "Eventos"**
   
   - Este nó tem 6 saídas configuradas:
     1. 0126 - Protocolo Antissistema
     2. 0126 - Social Seller (Instagram)
     3. 0126 - Social Seller (WhatsApp)
     4. 0126 - On The Road 2.0
     5. Pausa Extra
     6. Agendamento Lead Closer

4. **Adicionar Nova Regra de Roteamento**

   a. Clique no nó `Eventos`
   
   b. Abra as configurações
   
   c. Clique em **"Add Routing Rule"**
   
   d. Configure:
   
   **Output Key**:
   ```
   [Nome do Evento]
   ```
   
   **Condição**:
   ```
   $('Edit Fields').item.json.event === "[Nome Exato do Evento]"
   ```

5. **Criar Nó de Envio**

   a. Adicione novo nó `HTTP Request`
   
   b. Configure:
   - **Nome**: `Enviar Lembrete 10min "[Nome do Evento]"`
   - **Method**: POST
   - **URL**: `https://unnichat.com.br/a/start/[ID_CONEXAO_10MIN]`
   - **Send Body**: true
   
   c. **Body Parameters**:
   ```json
   {
     "telefone": "={{ $json.telefone }}",
     "meet_link": "={{ $json.meet_link }}",
     "negociando": "={{ $json.negociando }}"
   }
   ```

6. **Conectar ao Switch e Loop**
   
   - Conecte saída do Switch ao HTTP Request
   - Conecte HTTP Request de volta ao Loop Over Items

7. **Salvar**

#### Diferenças entre 2h e 10min

| Aspecto | 2h Antes | 10min Antes |
|---------|----------|-------------|
| **Foco** | Confirmação e preparação | Lembrete urgente com link |
| **Parâmetros** | nome, telefone, horário | telefone, meet_link, negociando |
| **Urgência** | Média | Alta |
| **Conteúdo** | Informações gerais | Link direto para reunião |

#### Exemplo Prático: Adicionar Evento "0127 - Imersão Alpha"

**Passos**:

1. Abrir workflow "10min antes do agendamento"
2. Clicar no nó `Eventos`
3. Adicionar nova regra:
   - **Output Key**: `0127 - Imersão Alpha`
   - **Condição**: `$('Edit Fields').item.json.event === "0127 - Imersão Alpha"`
4. Adicionar HTTP Request:
   - **URL**: `https://unnichat.com.br/a/start/[ID_CONEXAO_10MIN]`
   - **Body**:
     ```json
     {
       "telefone": "={{ $json.telefone }}",
       "meet_link": "={{ $json.meet_link }}",
       "negociando": "={{ $json.negociando }}"
     }
     ```
5. Conectar ao Switch e Loop
6. Salvar

---

## Passo 4: Testes e Validação

### 4.1 Teste no Sistema TradeSpot 2.0

1. **Criar Agendamento de Teste**
   
   a. Acesse a tela de "Todos os Agendamentos"
   
   b. Clique em "Novo Agendamento"
   
   c. Preencha:
   - **Evento**: Selecione o novo evento criado
   - **Cliente**: Crie ou selecione um cliente de teste
   - **Data**: Amanhã
   - **Horário**: Daqui a 3 horas
   - **Tipo**: Conforme o evento
   - **Atendente**: Selecione um atendente
   
   d. Salve o agendamento

2. **Verificar Logs do Workflow "Receber Novo Agendamento"**
   
   a. Acesse n8n
   
   b. Vá para "Executions"
   
   c. Encontre a execução mais recente do workflow "Receber Novo Agendamento"
   
   d. Verifique:
   - Status: Success (verde)
   - O evento foi roteado corretamente
   - A conexão UnniChat foi chamada
   - Os parâmetros estão corretos

3. **Verificar no UnniChat**
   
   a. Acesse UnniChat
   
   b. Busque o contato pelo número de telefone
   
   c. Verifique:
   - Mensagem foi enviada
   - Variáveis foram preenchidas corretamente
   - Horário está correto

### 4.2 Teste de Lembrete 2h Antes

**IMPORTANTE**: Este teste requer que você ajuste o horário do agendamento

1. **Criar Agendamento com Horário Específico**
   
   - Data: Hoje
   - Horário: Exatamente 2 horas e 3 minutos no futuro
   - Exemplo: Se agora são 14:00, coloque 16:03
   - Status: Pendente

2. **Aguardar Execução do Cron**
   
   - O cron executa em :00, :15, :30, :45
   - Se você criou para 16:03, o cron de 14:00 ou 14:15 deve pegar

3. **Verificar Execução**
   
   a. n8n → Executions → "2h antes do agendamento"
   
   b. Verificar:
   - Query SQL retornou o agendamento
   - Switch roteou para o evento correto
   - HTTP Request foi executado
   - Retornou ao loop

4. **Verificar Mensagem no UnniChat**
   
   - Mensagem de lembrete 2h enviada
   - Variáveis corretas

### 4.3 Teste de Lembrete 10min Antes

Similar ao teste de 2h, mas:

- Horário: 10 minutos no futuro
- Cron executa em :05, :20, :35, :50
- Exemplo: Se agora são 14:12, criar para 14:22

### 4.4 Teste de Atualização

1. **Alterar Status do Agendamento**
   
   a. Edite o agendamento de teste
   
   b. Mude o status:
   - De: Pendente
   - Para: Realizado

2. **Verificar Workflow**
   
   a. n8n → Executions → "Atualização de Agendamento"
   
   b. Verificar roteamento correto

3. **Verificar Mensagem no UnniChat**

### 4.5 Teste Completo End-to-End

**Cenário**: Agendar → Receber confirmação → Receber lembrete 2h → Receber lembrete 10min → Atualizar status

1. Criar agendamento para daqui a 2h15min
2. Verificar mensagem de confirmação
3. Aguardar 15min
4. Verificar mensagem de lembrete 2h
5. Aguardar mais 2h05min
6. Verificar mensagem de lembrete 10min
7. Alterar status para "Realizado"
8. Verificar mensagem de atualização

---

## Checklist de Implementação

Use este checklist para garantir que nada foi esquecido:

### Sistema TradeSpot 2.0

- [ ] Evento criado na tela de Eventos
- [ ] Nome do evento está correto e único
- [ ] Setor está correto
- [ ] Status está "Ativo"
- [ ] Evento aparece na lista de eventos
- [ ] Evento aparece nas opções de criação de agendamento

### UnniChat

- [ ] Conexão de "Novo Agendamento" criada
- [ ] Mensagem de "Novo Agendamento" configurada com variáveis
- [ ] ID da conexão anotado
- [ ] Conexão de "Lembrete 2h" criada (se aplicável)
- [ ] Mensagem de "Lembrete 2h" configurada
- [ ] ID da conexão anotado
- [ ] Conexão de "Lembrete 10min" criada (se aplicável)
- [ ] Mensagem de "Lembrete 10min" configurada
- [ ] ID da conexão anotado
- [ ] Conexão de "Atualização" criada (se aplicável)
- [ ] Mensagem de "Atualização" configurada
- [ ] ID da conexão anotado

### Workflow: Receber Novo Agendamento

- [ ] Workflow aberto no n8n
- [ ] Webhook correto identificado (baseado no tipo)
- [ ] Nova condição/regra adicionada para o evento
- [ ] Nó HTTP Request criado com ID correto da conexão
- [ ] Body Parameters configurados corretamente
- [ ] Nós conectados corretamente
- [ ] Workflow salvo
- [ ] Teste realizado com sucesso

### Workflow: Atualização de Agendamento

- [ ] Workflow aberto no n8n
- [ ] Estrutura de decisão analisada
- [ ] Localização correta determinada (Lead Closer/Social Seller/Setor)
- [ ] Condição adicionada ou conexão criada
- [ ] Workflow salvo
- [ ] Teste realizado com sucesso

### Workflow: 2h Antes do Agendamento

- [ ] Workflow aberto no n8n
- [ ] Switch "Eventos" localizado
- [ ] Nova regra de roteamento adicionada
- [ ] Output Key configurado
- [ ] Condição configurada com nome exato do evento
- [ ] Nó HTTP Request criado
- [ ] URL com ID correto da conexão
- [ ] Body Parameters configurados
- [ ] Conectado ao Switch
- [ ] Conectado de volta ao Loop
- [ ] Workflow salvo
- [ ] Teste realizado com sucesso

### Workflow: 10min Antes do Agendamento

- [ ] Workflow aberto no n8n
- [ ] Switch "Eventos" localizado
- [ ] Nova regra de roteamento adicionada
- [ ] Output Key configurado
- [ ] Condição configurada com nome exato do evento
- [ ] Nó HTTP Request criado
- [ ] URL com ID correto da conexão
- [ ] Body Parameters configurados (telefone, meet_link, negociando)
- [ ] Conectado ao Switch
- [ ] Conectado de volta ao Loop
- [ ] Workflow salvo
- [ ] Teste realizado com sucesso

### Testes

- [ ] Teste de criação de agendamento realizado
- [ ] Mensagem de confirmação recebida no UnniChat
- [ ] Teste de lembrete 2h realizado (se aplicável)
- [ ] Mensagem de 2h recebida no UnniChat
- [ ] Teste de lembrete 10min realizado (se aplicável)
- [ ] Mensagem de 10min recebida no UnniChat
- [ ] Teste de atualização de status realizado
- [ ] Mensagem de atualização recebida no UnniChat
- [ ] Teste end-to-end completo realizado
- [ ] Logs verificados e sem erros

### Documentação

- [ ] IDs das conexões documentados
- [ ] Mudanças nos workflows documentadas
- [ ] Data de implementação registrada
- [ ] Equipe informada sobre novo evento

---

## Troubleshooting

### Problema: Evento não aparece nas opções de agendamento

**Causas possíveis**:
- Evento está com status "Arquivado"
- Setor do evento não corresponde ao setor do usuário
- Cache do navegador

**Solução**:
1. Verificar status do evento (deve estar "Ativo")
2. Verificar setor do evento
3. Limpar cache do navegador (Ctrl + Shift + Delete)
4. Fazer logout e login novamente

---

### Problema: Webhook "Receber Novo Agendamento" não é acionado

**Causas possíveis**:
- Tipo de agendamento não corresponde ao webhook
- Erro no backend ao enviar webhook
- Workflow inativo

**Solução**:
1. Verificar qual tipo foi selecionado na criação do agendamento
2. Verificar logs do backend:
   ```bash
   # No servidor
   tail -f /var/log/tradespot.log | grep webhook
   ```
3. Verificar se workflow está ativo no n8n
4. Testar webhook manualmente com cURL

---

### Problema: Evento não é roteado corretamente no Switch

**Causas possíveis**:
- Nome do evento não está exatamente igual
- Condição mal escrita
- Evento caindo no branch "default"

**Solução**:
1. Copiar o nome exato do evento do banco de dados:
   ```sql
   SELECT event_name FROM events WHERE id = '[ID_DO_EVENTO]';
   ```
2. Verificar se há espaços extras, caracteres especiais
3. Testar condição no n8n com dados de exemplo
4. Verificar se o evento está antes ou depois de condições conflitantes

---

### Problema: Variáveis não são substituídas nas mensagens do UnniChat

**Causas possíveis**:
- Nome da variável errado
- Campo não está sendo enviado no body
- Sintaxe incorreta no UnniChat

**Solução**:
1. Verificar body Parameters do HTTP Request no n8n
2. Verificar logs de execução para ver exatamente o que foi enviado
3. Verificar sintaxe das variáveis no UnniChat:
   - Correto: `{{variavel}}`
   - Incorret: `{variavel}` ou `${variavel}`
4. Testar manualmente a conexão UnniChat com dados fixos

---

### Problema: Lembrete 2h ou 10min não é enviado

**Causas possíveis**:
- Agendamento não está com status "Pendente"
- Horário do agendamento não cai na janela do cron
- Query SQL não está retornando o agendamento
- Evento não está mapeado no Switch

**Solução**:
1. Verificar status do agendamento (deve ser "Pendente")
2. Verificar horário:
   - Para 2h: deve estar entre $now+1h55min e $now+2h05min na execução do cron
   - Para 10min: deve estar entre $now+9min e $now+11min
3. Executar query SQL manualmente:
   ```sql
   -- Para 2h antes
   SELECT a.*, c.name, e.event_name
   FROM appointments a
   JOIN clients c ON a.client_id = c.id
   JOIN events e ON a.event_id = e.id
   WHERE a.status = 'Pendente'
     AND a.date = current_date + interval '2 hours'
     AND a.time > (current_time + interval '1 hour 55 minutes')
     AND a.time <= (current_time + interval '2 hours 5 minutes');
   ```
4. Verificar se evento está no Switch
5. Verificar logs de execução do workflow

---

### Problema: Múltiplas mensagens sendo enviadas

**Causas possíveis**:
- Loop não está retornando corretamente
- Workflow sendo executado múltiplas vezes
- Agendamento caindo em múltiplas janelas

**Solução**:
1. Verificar se cada branch do Switch retorna ao Loop Over Items
2. Verificar cron schedule para evitar sobreposição
3. Ajustar janelas SQL para evitar duplicatas
4. Adicionar flag de "lembrete enviado" no banco (melhoria futura)

---

### Problema: Erro 401/403 no UnniChat

**Causas possíveis**:
- Token de autenticação expirado
- ID da conexão incorreto
- Conexão foi deletada

**Solução**:
1. Verificar se a conexão existe no UnniChat
2. Verificar ID da conexão (copiar novamente)
3. Testar com cURL:
   ```bash
   curl -X POST https://unnichat.com.br/a/start/[ID] \
     -H "Content-Type: application/json" \
     -d '{"telefone":"5541999999999","nome":"Teste"}'
   ```
4. Se necessário, gerar novo token de autenticação

---

## Manutenção e Boas Práticas

### Documentar Sempre

Sempre que adicionar um novo evento, documente:

1. **No arquivo de eventos**:
   ```markdown
   ## Evento: [Nome do Evento]
   - ID: [UUID]
   - Data de criação: [Data]
   - Criado por: [Nome]
   - Setor: [Setor]
   - Tipo de agendamento: [Tipo]
   
   ### Conexões UnniChat
   - Novo Agendamento: [ID]
   - Lembrete 2h: [ID]
   - Lembrete 10min: [ID]
   - Atualização: [ID]
   
   ### Workflows Atualizados
   - [x] Receber Novo Agendamento
   - [x] Atualização de Agendamento
   - [x] 2h Antes
   - [x] 10min Antes
   ```

2. **No Notion/Confluence** (se existir)

3. **Comunicar à equipe**

### Convenções de Nomenclatura

**Eventos**:
- Formato: `XXXX - Nome Descritivo`
- Exemplo: `0126 - Social Seller (Instagram)`
- Use códigos numéricos consistentes
- Evite caracteres especiais além do hífen e parênteses

**Conexões UnniChat**:
- Formato: `[Evento] - [Tipo]`
- Exemplo: `0126 Social Seller - Novo Agendamento`

**Nós no n8n**:
- Formato: `Enviar para "[Nome]"`
- Exemplo: `Enviar para "SDR"`

### Testes Regulares

Mensalmente:
- Testar um agendamento de cada evento
- Verificar se lembretes estão sendo enviados
- Verificar logs de erro no n8n
- Validar métricas de entrega no UnniChat

### Backup

Antes de fazer alterações:
1. Exportar o workflow atual do n8n
2. Salvar em controle de versão (Git)
3. Documentar a versão

---

## Histórico de Alterações

| Data | Evento Adicionado | Responsável | Observações |
|------|-------------------|-------------|-------------|
| 2026-01-26 | - | Equipe TradeStars | Documentação inicial |

---

## Referências

- [Documentação: Workflow Receber Novo Agendamento](./workflow-receber-novo-agendamento.md)
- [Documentação: Workflow Atualização de Agendamento](./workflow-atualizacao-agendamento.md)
- [Documentação: Workflows de Lembretes](./workflow-lembretes-agendamento.md)

---

## Suporte

Para dúvidas sobre este processo:
- **Desenvolvimento**: Equipe TradeStars
- **n8n**: n8n.tradestars.com.br
- **UnniChat**: suporte@unnichat.com.br

---

**Última atualização**: 26/01/2026
