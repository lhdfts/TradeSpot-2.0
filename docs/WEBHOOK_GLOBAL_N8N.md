# Documentação: Novo Fluxo Unificado no n8n & Integração TradeSpot

Esta documentação detalha a arquitetura, o fluxo de dados e os ajustes realizados na API do **TradeSpot 2.0** para suportar o novo fluxo unificado de agendamentos no **n8n** (`Receber Novo Agendamento copy (2).json`), baseado no setor do atendente (`attendant_sector`), além da **Sincronização Automática de Eventos (Data Table Dinâmica)**.

---

## 1. Visão Geral e Motivação

Anteriormente, o TradeSpot gerenciava os disparos de webhooks primariamente pelo **tipo de agendamento** (`type`). Com o crescimento da plataforma e a distribuição de agendamentos entre diferentes setores (onde múltiplos setores podem realizar o mesmo tipo de agendamento ou atuar em eventos transversais), tornou-se necessário um **roteamento centralizado baseado no setor do atendente responsável (`attendant_sector`)**.

Para atender a essa necessidade **sem quebrar ou impactar as automações antigas** que já estavam em produção, foi adotada uma arquitetura de **Duplo Disparo Unificado**:
1. O backend continua disparando normalmente para os webhooks específicos por tipo (`getAppointmentWebhooks()[APPOINTMENT_TYPE]`).
2. Adicionalmente, o backend enriquece o payload com o campo **`attendant_sector`** e dispara para um **Webhook Global Unificado** no n8n (`WEBHOOK_GLOBAL_APPOINTMENTS`), onde ocorre todo o roteamento inteligente por setor e evento.

---

## 2. Estrutura do Novo Fluxo no n8n (Roteamento Dinâmico - Abordagem A)

O fluxo no n8n foi otimizado para eliminar a manutenção manual de nós `Switch` com centenas de ramificações para cada evento. A arquitetura moderna utiliza **Consulta em Data Table + URL Dinâmica**:

```mermaid
graph TD
    A[1. Webhook POST<br/>/webhook/ace01ef3-db47...] --> B[2. Formatar Dados<br/>Normalização Zod/JSON]
    B --> C{3. Switch: Setores<br/>por $json.attendant_sector}
    
    C -->|Aldeia| L1[4. Lookup na Data Table<br/>event_name == $json.evento]
    C -->|Closer| L2[4. Lookup na Data Table<br/>event_name == $json.evento]
    C -->|Perpétuos| L3[4. Lookup na Data Table<br/>event_name == $json.evento]
    C -->|Suporte Presencial| L4[4. Lookup na Data Table<br/>event_name == $json.evento]
    C -->|Tribo| L5[4. Lookup na Data Table<br/>event_name == $json.evento]

    L1 --> E1[5. HTTP Request Dinâmico<br/>URL: ={{ $json.unnichat_url }}]
    L2 --> E2[5. HTTP Request Dinâmico<br/>URL: ={{ $json.unnichat_url }}]
    L3 --> E3[5. HTTP Request Dinâmico<br/>URL: ={{ $json.unnichat_url }}]
    L4 --> E4[5. HTTP Request Dinâmico<br/>URL: ={{ $json.unnichat_url }}]
    L5 --> E5[5. HTTP Request Dinâmico<br/>URL: ={{ $json.unnichat_url }}]
```

### 2.1. Nó de Entrada (`Webhook`)
- **Método HTTP:** `POST`
- **Path do Webhook:** `ace01ef3-db47-4e62-ba23-2812e5d65e11`
- **URL Completa (Produção):** `https://n8n.tradestars.com.br/webhook/ace01ef3-db47-4e62-ba23-2812e5d65e11`
- Recebe o payload JSON completo enviado pela API do TradeSpot no momento em que um agendamento é criado (`POST /api/appointments` ou `POST /api/public/appointments`).

### 2.2. Nó de Normalização (`Formatar Dados`)
O nó do tipo `n8n-nodes-base.set` converte os campos brutos recebidos na propriedade `$json.body` para variáveis planas de fácil consumo nos nós seguintes e nas APIs de destino:

| Variável Criada no n8n | Mapeamento do Payload TradeSpot (`$json.body`) | Formatação / Descrição |
| :--- | :--- | :--- |
| `data_hora` | `date` + `time` | Formato amigável: `dd/MM/yyyy às HH:mm` |
| `nome` | `lead` | Nome do cliente / lead |
| `telefone` | `phone` | Telefone de contato |
| `email` | `email` | E-mail do cliente |
| `atendente` | `attendant_name` | Nome completo do atendente que assumiu o agendamento |
| **`attendant_sector`** | **`attendant_sector`** | **Setor do atendente (`Aldeia`, `Closer`, `Tribo`, etc.)** |
| `created_by` | `created_by_name` | Nome do criador ou `Sistema (Link Público)` |
| `evento` | `event_name` | Nome do evento vinculado ao agendamento |
| `meet_link` | `meet_link` | Link do Google Meet gerado pelo sistema |
| `tipo` | `type` | Tipo do agendamento (ex: `Ligação Closer`, `Onboarding`) |

### 2.3. Roteador Principal (`Setores`)
Um nó `n8n-nodes-base.switch` avalia a propriedade **`attendant_sector`** e direciona a execução para o sub-fluxo correspondente (`Aldeia`, `Closer`, `Perpétuos`, `Suporte Presencial`, `Tribo`).

### 2.4. Consulta Dinâmica e Disparo Unnichat (`Lookup` + `HTTP Request`)
Em vez de switches fixos por evento, cada setor consulta a **Data Table** do n8n (ou Supabase) pela linha onde `event_name == $json.evento`. 
Em seguida, o nó `HTTP Request` utiliza a expressão `={{ $json.unnichat_url }}` no campo **URL** para acionar a conexão e a fila exata no Unnichat.

---

## 3. Sincronização Automática de Eventos (Data Table Sync)

Para manter a **Data Table do n8n** sempre 100% sincronizada e atualizada de forma autônoma quando eventos são criados ou alterados no TradeSpot, implementamos o **Webhook de Sincronização de Eventos** no backend:

### 3.1. Variáveis de Ambiente (`.env` & `webhooks.ts`)
Adicionamos a variável `WEBHOOK_SYNC_EVENTS` no arquivo `.env` / Vercel e o helper em `webhooks.ts`:

```env
# URL do Webhook do n8n responsável por atualizar a Data Table de Eventos
WEBHOOK_SYNC_EVENTS=https://n8n.tradestars.com.br/webhook/sync-events-datatable
```

```typescript
// server/src/config/webhooks.ts
export const getSyncEventsWebhook = (): string => {
    return process.env.WEBHOOK_SYNC_EVENTS || '';
};
```

### 3.2. Disparo Automático nas Rotas de CRUD (`appointmentRoutes.ts`)
Sempre que uma operação de evento (`POST /api/events`, `PUT /api/events/:id` ou `DELETE /api/events/:id`) ocorre com sucesso na interface do TradeSpot, o backend notifica o n8n em segundo plano via `axios.post`:

- **Criação de Evento (`POST /api/events`):** Envia `{ action: 'create', event: eventData }`
- **Atualização de Evento (`PUT /api/events/:id`):** Envia `{ action: 'update', event: eventData }`
- **Exclusão de Evento (`DELETE /api/events/:id`):** Envia `{ action: 'delete', event: { id } }`

### 3.3. Rota de Sincronização Completa (`POST /api/events/sync`)
Criamos um endpoint exclusivo (`POST /api/events/sync`) que permite a administradores ou ao próprio n8n disparar uma carga completa de todos os eventos da tabela do Supabase direto para o webhook de sincronização:

```typescript
// POST /api/events/sync - Sincroniza todos os eventos com a Data Table do n8n
router.post('/events/sync', requireRole('Admin', 'Dev', 'Líder'), async (req: AuthenticatedRequest, res: Response) => {
    const syncWebhook = getSyncEventsWebhook();
    if (!syncWebhook) {
        return res.status(400).json({ error: 'WEBHOOK_SYNC_EVENTS não configurado nas variáveis de ambiente (.env)' });
    }

    const { data: events, error } = await supabase.from('events').select('*');
    if (error) throw new Error(error.message);

    await axios.post(syncWebhook, {
        action: 'sync_all',
        events: events || []
    });

    res.json({ message: 'Sincronização com n8n disparada com sucesso!', total: events?.length || 0 });
});
```

---

## 4. Estrutura dos Payloads

### 4.1. Payload de Criação/Atualização de Agendamento (Para `WEBHOOK_GLOBAL_APPOINTMENTS`)
```json
{
  "id": "432181d3-99da-4def-af6a-3ce5850a1ab9",
  "client_id": "c1aff301-a47b-474a-93fb-0cc399cb129a",
  "date": "2026-07-17",
  "time": "18:30:00+00",
  "end_time": "19:30:00+00",
  "type": "Ligação Closer",
  "status": "Pendente",
  "meet_link": "https://meet.google.com/nyn-bwdc-hrd",
  "lead": "Nome do Aluno ou Lead",
  "phone": "5511999999999",
  "email": "aluno@exemplo.com",
  "attendant_name": "Saulo Bastianelli Pinto",
  "attendant_sector": "Closer",
  "created_by_name": "Leonardo",
  "creator_sector": "TEI",
  "event_name": "Aldeia 0626GOI Presencial",
  "event_sector": "Closer"
}
```

### 4.2. Payload de Sincronização de Eventos (Para `WEBHOOK_SYNC_EVENTS`)
```json
{
  "action": "create", // "create", "update", "delete" ou "sync_all"
  "event": {
    "id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
    "event_name": "Aldeia 0626GOI Presencial",
    "start_date": "2026-06-01",
    "end_date": "2026-06-30",
    "status": "Ativo",
    "sector": "Aldeia",
    "self_scheduling_link": "https://...",
    "duration_minutes": 60
  }
}
```
