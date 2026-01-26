# Documentação: Workflows de Lembretes de Agendamento

## Visão Geral

Este documento descreve dois workflows n8n complementares que enviam lembretes automáticos para clientes com agendamentos pendentes no TradeSpot 2.0:

1. **2h antes do agendamento** - Envia lembrete 2 horas antes do horário marcado
2. **10min antes do agendamento** - Envia lembrete 10 minutos antes do horário marcado

Ambos os workflows funcionam com base em agendamento cron, consultam o banco de dados Supabase e enviam notificações via conexões UnniChat de acordo com o evento associado ao agendamento.

---

## Workflow 1: 2h Antes do Agendamento

### Configurações Gerais

- **Nome**: 2h antes do agendamento
- **ID**: so5zdjc3QLJP49Qh
- **Estado**: Ativo
- **Timezone**: America/Sao_Paulo

---

### Trigger Schedule

**Tipo**: Schedule Trigger (Cron)

**Expressão Cron**: `0,15,30,45 * * * *`

**Execução**: 
- A cada 15 minutos em:
  - :00 (hora cheia)
  - :15 (15 minutos)
  - :30 (30 minutos)
  - :45 (45 minutos)

**Exemplo**: Se a hora atual é 14h, executa em 14:00, 14:15, 14:30, 14:45

---

### Consulta SQL

**Banco de Dados**: PostgreSQL (Supabase)

**Query**:
```sql
SELECT
  a.*,
  c.name as "clientName",
  c.phone as "clientPhone",
  c.email as "clientEmail",
  u.name as "attendantName",
  e.event_name as "eventName"
FROM
  public.appointments a
LEFT JOIN
  public.clients c ON a.client_id = c.id
LEFT JOIN
  public."user" u ON a.attendant_id = u.id
LEFT JOIN
  public.events e ON a.event_id = e.id
WHERE
  a.status = 'Pendente'
  -- Garante a data correta
  AND a.date = '{{ $now.plus(2, "hours").format("yyyy-MM-dd") }}'
  -- Lógica da Janela Segura para blocos fixos de 15 min:
  -- Pega desde 5 minutos antes do alvo até 5 minutos depois.
  -- Ex: Se alvo é 21:15, pega de 21:10:00 até 21:20:00
  AND a.time > '{{ $now.plus(2, "hours").minus(5, "minutes").format("HH:mm:ss") }}'
  AND a.time <= '{{ $now.plus(2, "hours").plus(5, "minute").format("HH:mm:ss") }}'
```

**Lógica de Janela Segura**:
- Busca agendamentos que estão cerca de 2 horas no futuro
- Usa janela de ±5 minutos para capturar agendamentos corretamente
- Alinha com a execução a cada 15 minutos do cron
- Evita duplicatas e perda de agendamentos

---

### Processamento de Dados

#### Transformação de Campos (Edit Fields)

| Campo SQL | Campo Transformado | Formato |
|-----------|-------------------|---------|
| `clientName` | `nome` | string |
| `clientPhone` | `telefone` | string |
| `date` | `data_agendamento` | dd/MM/yyyy |
| `time` | `horario_agendamento` | HH:mm |
| `eventName` | `event` | string |
| `status` | `status` | string |
| `type` | `tipo_atendimento` | string |
| `attendantName` | `negociando` | string |
| `meet_link` | `meet_link` | string |

#### Loop Over Items

- **Tipo**: Split in Batches
- **Função**: Processa cada agendamento individualmente
- **Wait**: 1 segundo entre cada item para evitar rate limiting

---

### Roteamento por Evento

O workflow utiliza um **Switch** com 7 condições baseadas no evento:

#### 1. 0126 - Protocolo Antissistema

**Condição**: `event === "0126 - Protocolo Antissistema"`

**Ação**: Envia para Conexão "SDR"
- URL: `https://unnichat.com.br/a/start/94x69P1V0qQPPEPvUyEb`
- Parâmetros:
  - telefone
  - data_agendamento (horario_agendamento)
  - nome

---

#### 2. 0126 - Social Seller (Instagram)

**Condição**: `event === "0126 - Social Seller (Instagram)"`

**Ação**: Integração com UnniChat
1. **Pesquisar Lead**
   - URL: `https://unnichat.com.br/api/contact/search`
   - Header: `Authorization: Bearer dbb05cd6-b607-41f0-b7f8-0dc36a0c0f6f`
   - Body: `{ "email": "clientEmail" }`

2. **Adicionar Tag**
   - URL: `https://unnichat.com.br/api/contact/{contactId}/tags`
   - Tag ID: `019b9e1e-d8b6-767f-ac56-11581d0a8763`
   - Nome: `mensagem_agendamento - 2hrs`

3. **Preencher Campo Personalizado: Negociando**
   - URL: `https://unnichat.com.br/api/contact/{contactId}/customFields`
   - Field ID: `JuflZgDJZc4R4vSVsRDQ`
   - Valor: Nome do atendente

---

#### 3. 0126 - Social Seller (WhatsApp)

**Condição**: `event === "0126 - Social Seller (WhatsApp)"`

**Ação**: Envia para Conexão "Social Seller (WhatsApp)"
- URL: `https://unnichat.com.br/a/start/aVpkVhLhtc4Oi93YV3zh`
- Parâmetros:
  - telefone
  - data_agendamento (horario_agendamento)
  - nome

---

#### 4. 0126 - On The Road 2.0

**Condição**: `event === "0126 - On The Road 2.0"`

**Ação**: Retorna ao loop (sem envio)

---

#### 5. 0126 - Área 80/20

**Condição**: `event === "0126 - Área 80/20"`

**Ação**: Retorna ao loop (sem envio)

---

#### 6. Agendamento Lead Closer

**Condição**: `event === "Agendamento Lead Closer"`

**Ação**: Envia para Conexão "Closer"
- URL: `https://unnichat.com.br/a/start/o91ZvMROcjwwhZuS7epV`
- Parâmetros:
  - nome
  - telefone
  - data_agendamento (horario_agendamento)

---

#### 7. Pausa Extra

**Condição**: `event === "Pausa Extra"`

**Ação**: Retorna ao loop (sem envio)

---

## Workflow 2: 10min Antes do Agendamento

### Configurações Gerais

- **Nome**: 10min antes do agendamento
- **ID**: q31Z9geOXPMYQDlE
- **Estado**: Ativo
- **Timezone**: America/Sao_Paulo

---

### Trigger Schedule

**Tipo**: Schedule Trigger (Cron)

**Expressão Cron**: `5,20,35,50 * * * *`

**Execução**: 
- A cada 15 minutos em:
  - :05 (5 minutos)
  - :20 (20 minutos)
  - :35 (35 minutos)
  - :50 (50 minutos)

**Exemplo**: Se a hora atual é 14h, executa em 14:05, 14:20, 14:35, 14:50

**Diferença de execução**: Este workflow executa 5 minutos depois do workflow de 2h antes, evitando sobrecarga simultânea.

---

### Consulta SQL

**Banco de Dados**: PostgreSQL (Supabase)

**Query**:
```sql
SELECT
  a.*,
  c.name as "clientName",
  c.phone as "clientPhone",
  c.email as "clientEmail",
  u.name as "attendantName",
  e.event_name as "eventName"
FROM
  public.appointments a
LEFT JOIN
  public.clients c ON a.client_id = c.id
LEFT JOIN
  public."user" u ON a.attendant_id = u.id
LEFT JOIN
  public.events e ON a.event_id = e.id
WHERE
  a.status = 'Pendente'
  AND a.date = '{{ $now.plus(10, "minutes").format("yyyy-MM-dd") }}'
  AND a.time >= '{{ $now.plus(9, "minutes").format("HH:mm:ss") }}'
  AND a.time <= '{{ $now.plus(11, "minutes").format("HH:mm:ss") }}'
```

**Lógica de Janela**:
- Busca agendamentos que estão cerca de 10 minutos no futuro
- Janela de ±1 minuto (9 a 11 minutos)
- Mais precisa que o workflow de 2h devido à proximidade do evento

---

### Processamento de Dados

#### Transformação de Campos (Edit Fields)

Idêntico ao workflow de 2h antes:

| Campo SQL | Campo Transformado | Formato |
|-----------|-------------------|---------|
| `clientName` | `nome` | string |
| `clientPhone` | `telefone` | string |
| `date` | `data_agendamento` | dd/MM/yyyy |
| `time` | `horario_agendamento` | HH:mm |
| `eventName` | `event` | string |
| `status` | `status` | string |
| `type` | `tipo_atendimento` | string |
| `attendantName` | `negociando` | string |
| `meet_link` | `meet_link` | string |

#### Loop Over Items

- **Tipo**: Split in Batches
- **Função**: Processa cada agendamento individualmente
- **Wait**: 1 segundo entre cada item

---

### Roteamento por Evento

O workflow utiliza um **Switch** com 6 condições baseadas no evento:

#### 1. 0126 - Protocolo Antissistema

**Condição**: `event === "0126 - Protocolo Antissistema"`

**Ação**: Envia para Conexão "SDR"
- URL: `https://unnichat.com.br/a/start/0APJefYtfzeYBcinH8Uw`
- Parâmetros:
  - telefone
  - meet_link
  - negociando

---

#### 2. 0126 - Social Seller (Instagram)

**Condição**: `event === "0126 - Social Seller (Instagram)"`

**Ação**: Integração com UnniChat
1. **Pesquisar Lead**
   - URL: `https://unnichat.com.br/api/contact/search`
   - Header: `Authorization: Bearer dbb05cd6-b607-41f0-b7f8-0dc36a0c0f6f`
   - Body: `{ "email": "clientEmail" }`

2. **Adicionar Tag**
   - URL: Erro na configuração (URL aponta para nome da tag)
   - Tag ID: `019b9e1e-bee8-7478-a8e4-d6fd22a96680`
   - Nome: `mensagem_agendamento - 10 min`

3. **Preencher Campo Personalizado: Negociando**
   - URL: `https://unnichat.com.br/api/contact/{contactId}/customFields`
   - Field ID: `JuflZgDJZc4R4vSVsRDQ`
   - Valor: Nome do atendente

---

#### 3. 0126 - Social Seller (WhatsApp)

**Condição**: `event === "0126 - Social Seller (WhatsApp)"`

**Ação**: Envia para Conexão "Social Seller (WhatsApp)"
- URL: `https://unnichat.com.br/a/start/yBhKRHMx51GgFSftGNYm`
- Parâmetros:
  - telefone
  - meet_link
  - negociando

---

#### 4. 0126 - On The Road 2.0

**Condição**: `event === "0126 - On The Road 2.0"`

**Ação**: Retorna ao loop (sem envio)

---

#### 5. Pausa Extra

**Condição**: `event === "Pausa Extra"`

**Ação**: Retorna ao loop (sem envio)

---

#### 6. Agendamento Lead Closer

**Condição**: `event === "Agendamento Lead Closer"`

**Ação**: Envia para Conexão "Closer"
- URL: `https://unnichat.com.br/a/start/MzJf0HBbWZQUkLwb0TDn`
- Parâmetros:
  - telefone
  - atendente (negociando)
  - link_meet

---

## Tabela Comparativa dos Workflows

| Aspecto | 2h Antes | 10min Antes |
|---------|----------|-------------|
| **Cron Expression** | `0,15,30,45 * * * *` | `5,20,35,50 * * * *` |
| **Horários de Execução** | :00, :15, :30, :45 | :05, :20, :35, :50 |
| **Antecedência** | 2 horas | 10 minutos |
| **Janela SQL** | ±5 minutos | ±1 minuto |
| **Tag UnniChat** | `mensagem_agendamento - 2hrs` | `mensagem_agendamento - 10 min` |
| **Número de Eventos** | 7 eventos | 6 eventos (sem Área 80/20) |
| **Parâmetros Principais** | nome, telefone, horário | telefone, meet_link, negociando |
| **Foco da Mensagem** | Confirmação e preparação | Lembrete imediato com link |

---

## Conexões UnniChat

### Workflow 2h Antes

| Evento | Conexão | ID | Parâmetros |
|--------|---------|-----|-----------|
| Protocolo Antissistema | SDR | 94x69P1V0qQPPEPvUyEb | telefone, data_agendamento, nome |
| Social Seller (Instagram) | UnniChat API | - | Pesquisa + Tag + Campo personalizado |
| Social Seller (WhatsApp) | Social Seller (WhatsApp) | aVpkVhLhtc4Oi93YV3zh | telefone, data_agendamento, nome |
| Agendamento Lead Closer | Closer | o91ZvMROcjwwhZuS7epV | nome, telefone, data_agendamento |

### Workflow 10min Antes

| Evento | Conexão | ID | Parâmetros |
|--------|---------|-----|-----------|
| Protocolo Antissistema | SDR | 0APJefYtfzeYBcinH8Uw | telefone, meet_link, negociando |
| Social Seller (Instagram) | UnniChat API | - | Pesquisa + Tag + Campo personalizado |
| Social Seller (WhatsApp) | Social Seller (WhatsApp) | yBhKRHMx51GgFSftGNYm | telefone, meet_link, negociando |
| Agendamento Lead Closer | Closer | MzJf0HBbWZQUkLwb0TDn | telefone, atendente, link_meet |

---

## IDs de Recursos UnniChat

### Tags

| Nome | ID | Usado em |
|------|-----|----------|
| mensagem_agendamento - 2hrs | 019b9e1e-d8b6-767f-ac56-11581d0a8763 | 2h antes |
| mensagem_agendamento - 10 min | 019b9e1e-bee8-7478-a8e4-d6fd22a96680 | 10min antes |

### Campos Personalizados

| Nome | ID | Usado em |
|------|-----|----------|
| Negociando | JuflZgDJZc4R4vSVsRDQ | Ambos workflows |

### Token de Autenticação

- **Bearer Token**: `dbb05cd6-b607-41f0-b7f8-0dc36a0c0f6f`
- **Usado em**: Pesquisa de contatos, adicionar tags e preencher campos personalizados

---

## Diagrama de Fluxo - 2h Antes

```mermaid
graph TD
    A[Cron: 0,15,30,45] --> B[Consultar SQL: +2h ±5min]
    B --> C[Loop Over Items]
    C --> D[Wait 1 segundo]
    D --> E[Edit Fields]
    E --> F{Switch por Evento}
    
    F -->|Protocolo Antissistema| G[Enviar SDR]
    F -->|Social Seller Instagram| H[Pesquisar Lead]
    F -->|Social Seller WhatsApp| I[Enviar WhatsApp]
    F -->|On The Road| J[Sem ação]
    F -->|Área 80/20| K[Sem ação]
    F -->|Lead Closer| L[Enviar Closer]
    F -->|Pausa Extra| M[Sem ação]
    
    H --> N[Adicionar Tag 2hrs]
    N --> O[Preencher Negociando]
    O --> P[Retornar ao Loop]
    
    G --> P
    I --> P
    J --> P
    K --> P
    L --> P
    M --> P
```

---

## Diagrama de Fluxo - 10min Antes

```mermaid
graph TD
    A[Cron: 5,20,35,50] --> B[Consultar SQL: +10min ±1min]
    B --> C[Loop Over Items]
    C --> D[Wait 1 segundo]
    D --> E[Edit Fields]
    E --> F{Switch por Evento}
    
    F -->|Protocolo Antissistema| G[Enviar SDR]
    F -->|Social Seller Instagram| H[Pesquisar Lead]
    F -->|Social Seller WhatsApp| I[Enviar WhatsApp]
    F -->|On The Road| J[Sem ação]
    F -->|Lead Closer| K[Enviar Closer]
    F -->|Pausa Extra| L[Sem ação]
    
    H --> M[Adicionar Tag 10min]
    M --> N[Preencher Negociando]
    N --> O[Retornar ao Loop]
    
    G --> O
    I --> O
    J --> O
    K --> O
    L --> O
```

---

## Eventos que NÃO Recebem Lembretes

Os seguintes eventos não recebem lembretes automáticos em um ou ambos os workflows:

### Ambos Workflows
- **Pausa Extra**: Não requer notificação de lembrete

### Workflow 2h Antes
- **0126 - On The Road 2.0**: Sem lembrete 2h antes
- **0126 - Área 80/20**: Sem lembrete 2h antes

### Workflow 10min Antes
- **0126 - On The Road 2.0**: Sem lembrete 10min antes
- **0126 - Área 80/20**: Não está mapeado neste workflow

---

## Casos de Uso

### Caso 1: Cliente com Agendamento de Social Seller (Instagram) às 16:00

**Workflow 2h Antes (14:00)**:
1. Cron executa às 14:00
2. SQL busca agendamentos entre 15:55 e 16:05
3. Encontra o agendamento das 16:00
4. Pesquisa lead no UnniChat pelo email
5. Adiciona tag "mensagem_agendamento - 2hrs"
6. Preenche campo "Negociando" com nome do atendente
7. Cliente recebe mensagem automática de confirmação

**Workflow 10min Antes (15:50)**:
1. Cron executa às 15:50
2. SQL busca agendamentos entre 15:59 e 16:01
3. Encontra o agendamento das 16:00
4. Pesquisa lead no UnniChat pelo email
5. Adiciona tag "mensagem_agendamento - 10 min"
6. Preenche campo "Negociando" com nome do atendente
7. Cliente recebe mensagem de lembrete imediato

---

### Caso 2: Cliente com Agendamento de Protocolo Antissistema às 10:30

**Workflow 2h Antes (08:30)**:
1. Cron executa às 08:30
2. SQL busca agendamentos entre 10:25 e 10:35
3. Encontra o agendamento das 10:30
4. Envia para conexão SDR com:
   - telefone do cliente
   - horário: "10:30"
   - nome do cliente
5. Cliente recebe mensagem de confirmação

**Workflow 10min Antes (10:20)**:
1. Cron executa às 10:20
2. SQL busca agendamentos entre 10:29 e 10:31
3. Encontra o agendamento das 10:30
4. Envia para conexão SDR com:
   - telefone do cliente
   - meet_link
   - nome do atendente
5. Cliente recebe mensagem com link do meet

---

### Caso 3: Cliente com Agendamento de Pausa Extra às 15:45

**Ambos Workflows**:
- O agendamento é encontrado na query SQL
- Switch detecta evento "Pausa Extra"
- Retorna ao loop sem enviar nenhuma mensagem
- Nenhuma ação é tomada

---

## Checklist de Manutenção

### Verificações Diárias
- [ ] Confirmar que ambos workflows estão ativos
- [ ] Verificar logs de erro no n8n
- [ ] Confirmar execuções do cron nos horários esperados

### Verificações Semanais
- [ ] Validar conexão com banco Supabase
- [ ] Testar conexões UnniChat
- [ ] Verificar se as tags estão sendo aplicadas corretamente
- [ ] Confirmar que campos personalizados estão sendo preenchidos

### Verificações Mensais
- [ ] Revisar queries SQL para otimização
- [ ] Validar janelas de tempo (±5min e ±1min)
- [ ] Verificar se novos eventos precisam ser adicionados
- [ ] Atualizar IDs de conexões se necessário
- [ ] Revisar e limpar logs antigos

---

## Troubleshooting

### Problema: Lembretes duplicados

**Sintomas**: Cliente recebe múltiplas mensagens para o mesmo agendamento

**Causas Possíveis**:
- Janela SQL muito ampla
- Cron executando múltiplas vezes
- Loop não está retornando corretamente

**Solução**:
1. Verificar janela SQL:
   - 2h antes: deve ser ±5 minutos
   - 10min antes: deve ser ±1 minuto
2. Confirmar expressão cron:
   - 2h antes: `0,15,30,45 * * * *`
   - 10min antes: `5,20,35,50 * * * *`
3. Validar que o loop está retornando após cada envio

---

### Problema: Lembretes não são enviados

**Sintomas**: Cliente não recebe mensagens de lembrete

**Causas Possíveis**:
- Workflow inativo
- Erro na query SQL
- Conexão UnniChat com problema
- Evento não mapeado

**Solução**:
1. Verificar se workflow está ativo no n8n
2. Executar query SQL manualmente para validar resultados
3. Testar conexões UnniChat com Postman
4. Confirmar se o evento está no Switch
5. Verificar logs de execução no n8n

**Query de Teste Manual (2h antes)**:
```sql
-- Substitua os valores de data/hora pela execução esperada
SELECT
  a.*,
  c.name as "clientName",
  c.phone as "clientPhone",
  c.email as "clientEmail",
  u.name as "attendantName",
  e.event_name as "eventName"
FROM
  public.appointments a
LEFT JOIN public.clients c ON a.client_id = c.id
LEFT JOIN public."user" u ON a.attendant_id = u.id
LEFT JOIN public.events e ON a.event_id = e.id
WHERE
  a.status = 'Pendente'
  AND a.date = '2026-01-26'
  AND a.time > '11:00:00'
  AND a.time <= '11:10:00'
```

---

### Problema: Tag não está sendo aplicada (Instagram)

**Sintomas**: Lead não recebe a tag no UnniChat

**Causas Possíveis**:
- Lead não encontrado na pesquisa
- Email incorreto ou vazio
- Token de autenticação expirado
- ID da tag incorreto

**Solução**:
1. Verificar se o email do cliente está correto no banco
2. Testar pesquisa de lead manualmente:
```bash
curl -X POST https://unnichat.com.br/api/contact/search \
  -H "Authorization: Bearer dbb05cd6-b607-41f0-b7f8-0dc36a0c0f6f" \
  -H "Content-Type: application/json" \
  -d '{"email": "cliente@example.com"}'
```
3. Validar token de autenticação
4. Confirmar IDs das tags:
   - 2h antes: `019b9e1e-d8b6-767f-ac56-11581d0a8763`
   - 10min antes: `019b9e1e-bee8-7478-a8e4-d6fd22a96680`

---

### Problema: Horário de lembrete incorreto

**Sintomas**: Cliente recebe lembrete muito cedo ou muito tarde

**Causas Possíveis**:
- Timezone incorreto
- Janela SQL mal configurada
- Formato de hora incorreto no banco

**Solução**:
1. Confirmar timezone do workflow: `America/Sao_Paulo`
2. Verificar janela SQL:
   - 2h antes: `$now.plus(2, "hours").minus(5, "minutes")` até `$now.plus(2, "hours").plus(5, "minute")`
   - 10min antes: `$now.plus(9, "minutes")` até `$now.plus(11, "minutes")`
3. Validar formato de hora no campo `time` (deve ser `HH:mm:ssZZ`)
4. Executar query de teste para confirmar resultados

---

### Problema: Workflow 10min antes tem erro na URL da tag

**Sintomas**: Erro ao adicionar tag "mensagem_agendamento - 10 min"

**Causa**: URL configurada incorretamente no nó

**Solução**:
1. Editar nó "Colocar Tag 'mensagem_agendamento - 10 min'"
2. Corrigir URL de:
   ```
   Colocar Tag 'mensagem_agendamento - 10 min'
   ```
   Para:
   ```
   https://unnichat.com.br/api/contact/{{ $json.data[0].id }}/tags
   ```
3. Salvar e testar novamente

---

## Monitoramento e Métricas

### Métricas Importantes

**Por Workflow**:
- Taxa de sucesso de execução
- Número de agendamentos processados por execução
- Tempo médio de processamento por agendamento
- Taxa de erro por tipo de evento

**Por Conexão**:
- Número de mensagens enviadas por conexão
- Taxa de sucesso de envio
- Tempo de resposta da conexão

**Por Evento**:
- Distribuição de agendamentos por evento
- Taxa de conversão (lembrete enviado vs. agendamento realizado)

### Logs Recomendados

**Início de Execução**:
```javascript
console.log('[Lembrete 2h] Execução iniciada:', {
  timestamp: new Date().toISOString(),
  total_agendamentos: $items.length
});
```

**Processamento de Item**:
```javascript
console.log('[Lembrete 2h] Processando agendamento:', {
  timestamp: new Date().toISOString(),
  evento: $json.event,
  telefone: $json.telefone,
  horario: $json.horario_agendamento
});
```

**Envio para Conexão**:
```javascript
console.log('[Lembrete 2h] Enviado para conexão:', {
  timestamp: new Date().toISOString(),
  conexao: 'Nome da Conexão',
  evento: $json.event,
  telefone: $json.telefone
});
```

---

## Considerações de Performance

### Otimização de Query SQL

**Pontos de Atenção**:
- Índices nas colunas `status`, `date` e `time`
- LIMIT para evitar sobrecarga em caso de muitos agendamentos
- Uso de LEFT JOIN pode ser otimizado para INNER JOIN se garantido que todos agendamentos têm cliente, atendente e evento

**Query Otimizada**:
```sql
SELECT
  a.*,
  c.name as "clientName",
  c.phone as "clientPhone",
  c.email as "clientEmail",
  u.name as "attendantName",
  e.event_name as "eventName"
FROM
  public.appointments a
INNER JOIN public.clients c ON a.client_id = c.id
INNER JOIN public."user" u ON a.attendant_id = u.id
INNER JOIN public.events e ON a.event_id = e.id
WHERE
  a.status = 'Pendente'
  AND a.date = '{{ $now.plus(2, "hours").format("yyyy-MM-dd") }}'
  AND a.time > '{{ $now.plus(2, "hours").minus(5, "minutes").format("HH:mm:ss") }}'
  AND a.time <= '{{ $now.plus(2, "hours").plus(5, "minute").format("HH:mm:ss") }}'
LIMIT 100
```

### Rate Limiting

**Configuração Atual**:
- Wait de 1 segundo entre cada item
- Previne rate limiting do UnniChat
- Pode ser ajustado conforme limites da API

**Se necessário aumentar throughput**:
- Reduzir wait para 500ms
- Implementar processamento em batches
- Usar parallel processing com cuidado

---

## Histórico de Alterações

| Data | Workflow | Versão | Descrição |
|------|----------|--------|-----------|
| 2026-01-26 | Ambos | 1.0 | Documentação inicial dos workflows de lembrete |

---

## Responsáveis

- **Desenvolvimento**: Equipe TradeStars
- **Manutenção**: Equipe de Desenvolvimento TradeSpot 2.0
- **Suporte**: n8n.tradestars.com.br

---

## Suporte

Para dúvidas ou problemas relacionados a estes workflows, entre em contato com a equipe de desenvolvimento TradeStars.

---

**Última atualização**: 26/01/2026
