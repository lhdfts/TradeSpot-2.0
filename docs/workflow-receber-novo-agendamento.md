# 📋 Documentação: Workflow de Recebimento de Novos Agendamentos

## 📌 Visão Geral

O workflow **"Receber Novo Agendamento"** é responsável por processar e distribuir os agendamentos criados no TradeSpot 2.0, encaminhando-os para as respectivas conexões no sistema UnniChat com base no tipo de agendamento e evento associado.

---

## 🔄 Fluxo Principal

O workflow é acionado por **webhooks** que recebem dados dos agendamentos criados no TradeSpot 2.0. Dependendo do tipo de agendamento, o fluxo se ramifica para diferentes processamentos.

---

## 🎯 Tipos de Agendamento Suportados

O workflow processa 5 tipos principais de agendamentos, cada um com seu próprio webhook:

### 1️⃣ **Ligação Closer**
- **Webhook ID**: `fef2183b-d765-40f0-9841-eac5e368cedc`
- **Método**: POST
- **Processamento**: Formata os dados e envia para conexão apropriada

### 2️⃣ **Ligação SDR**
- **Webhook ID**: `a28b6ded-a788-4ccb-b4e1-7a526340dcba`
- **Método**: POST
- **Processamento**: Formata os dados e envia diretamente para conexão SDR

### 3️⃣ **Upgrade**
- **Webhook ID**: `dedb7d8d-9d21-464b-a612-365cbf973927`
- **Método**: POST
- **Processamento**: Formata os dados e roteia baseado no evento

### 4️⃣ **Reagendamento Closer**
- **Webhook ID**: `577bc264-f047-41df-9253-70b1bcc25421`
- **Método**: POST
- **Processamento**: Formata os dados e roteia baseado no evento

### 5️⃣ **Agendamento Pessoal**
- **Webhook ID**: `ee6b4b33-b977-4585-a1ca-526ee6e357f1`
- **Método**: POST
- **Processamento**: Verifica se é "Pausa Extra" ou encaminha para Closer

---

## 📊 Estrutura de Dados Recebidos

Cada webhook recebe um payload JSON com a seguinte estrutura:

```json
{
  "body": {
    "id": "uuid",
    "client_id": "uuid",
    "date": "2026-01-12",
    "time": "18:30:00+00",
    "type": "Tipo do Agendamento",
    "status": "Pendente",
    "meet_link": "https://meet.google.com/...",
    "notes": "string",
    "additional_info": "string",
    "created_at": "timestamp",
    "interest_level": "Alto|Médio|Baixo",
    "knowledge_level": "Iniciante|Intermediário|Avançado",
    "financial_currency": "BRL",
    "financial_amount": number,
    "end_time": "19:30:00+00",
    "google_event_id": "string",
    "lead": "Nome do Lead",
    "phone": "5541998618483",
    "email": "email@example.com",
    "attendant_name": "Nome do Atendente",
    "created_by_name": "Nome do Criador",
    "event_name": "Nome do Evento"
  }
}
```

---

## 🔧 Processamento de Dados

### **Transformação de Campos (Edit Fields)**

Para cada tipo de agendamento, os dados são transformados no seguinte formato:

| Campo Original | Campo Transformado | Formato |
|----------------|-------------------|---------|
| `date` + `time` | `data_hora` | "dd/MM/yyyy às HH:mm" |
| `lead` | `nome` | string |
| `phone` | `telefone` | string |
| `email` | `email` | string |
| `attendant_name` | `atendente` | string |
| `created_by_name` | `created_by` | string |
| `event_name` | `evento` | string |
| `meet_link` | `meet_link` | string |
| `type` | `tipo` | string (apenas para Ligação Closer) |

---

## 🌐 Integração com UnniChat

### **Fluxo 1: Instagram (0126 - Social Seller Instagram)**

**Condição**: `evento === "0126 - Social Seller (Instagram)"`

**Etapas**:

1. **Pesquisar Lead**
   - URL: `https://unnichat.com.br/api/contact/search`
   - Método: POST
   - Header: `Authorization: Bearer dbb05cd6-b607-41f0-b7f8-0dc36a0c0f6f`
   - Body: `{ "email": "email_do_lead" }`

2. **Adicionar Tag de Confirmação**
   - URL: `https://unnichat.com.br/api/contact/{contactId}/tags`
   - Tag ID: `019b9a25-5983-77a3-ab67-7ceae852f831`
   - Nome da Tag: `confirmação_de_agendamento`

3. **Preencher Campo Personalizado: Negociando**
   - URL: `https://unnichat.com.br/api/contact/{contactId}/customFields`
   - Field ID: `JuflZgDJZc4R4vSVsRDQ`
   - Valor: Nome do atendente

4. **Preencher Campo Personalizado: Data do Agendamento**
   - URL: `https://unnichat.com.br/api/contact/{contactId}/customFields`
   - Field ID: `IIc2eyqN7Ub2tLl4Un17`
   - Valor: Data/Hora formatada

5. **Preencher Campo Personalizado: Link do Meet**
   - URL: `https://unnichat.com.br/api/contact/{contactId}/customFields`
   - Field ID: `PHvAUXF2XetVXaeqNMWQ`
   - Valor: URL do Google Meet

---

### **Fluxo 2: WhatsApp (0126 - Social Seller WhatsApp)**

**Condição**: `evento === "0126 - Social Seller (WhatsApp)"`

**Ação**:
- URL: `https://unnichat.com.br/a/start/sVtfbOOyLHk5IrXwMrOy`
- Método: POST
- Parâmetros enviados:
  ```json
  {
    "nome": "Nome do Lead",
    "telefone": "Telefone",
    "email": "Email",
    "atendente": "Nome do Atendente",
    "created_by": "Criado Por",
    "evento": "Nome do Evento",
    "meet_link": "Link do Meet",
    "data_hora": "Data/Hora formatada",
    "tipo": "Tipo do Agendamento"
  }
  ```

---

### **Fluxo 3: On The Road 2.0 (0126 - On The Road 2.0)**

**Condição**: `evento === "0126 - On The Road 2.0"`

**Etapa 1 - Enviar para Conexão "Aldeia"**:
- URL: `https://unnichat.com.br/a/start/u8h2gcbp5gwShJmEUAYW`
- Parâmetros:
  ```json
  {
    "Telefone do Lead": "Telefone",
    "Data/Horário (Agendamento)": "Data/Hora",
    "Atendente": "Nome do Atendente",
    "Nome do Lead": "Nome",
    "Setor": ""
  }
  ```

**Etapa 2 - Enviar para Conexão "Closer"**:
- URL: `https://unnichat.com.br/a/start/4WCBo2j3JI3kms39aYSU`
- Parâmetros:
  ```json
  {
    "Telefone": "Telefone do Lead",
    "Atendente": "Nome do Atendente"
  }
  ```

---

### **Fluxo 4: Agendamento Direto Closer**

**Condição**: `evento === "Agendamento Lead Closer"`

**Ação**:
- URL: `https://unnichat.com.br/a/start/uqsS0xdnLNdWleMeYhv8`
- Envia todos os dados do agendamento para a conexão Closer

---

### **Fluxo 5: Ligação SDR (Padrão)**

**Quando**: Todos os outros eventos de "Ligação SDR"

**Ação**:
- URL: `https://unnichat.com.br/a/start/4GcRfvQTuFTc1plOx42Y`
- Envia todos os dados do agendamento para a conexão SDR

---

### **Fluxo 6: Pausa Extra**

**Condição**: `evento === "Pausa Extra"` (em Agendamento Pessoal)

**Ação**: Não envia para nenhuma conexão (branch vazio)

---

### **Fluxo 7: Outros Agendamentos Pessoais**

**Quando**: Agendamento Pessoal que NÃO é "Pausa Extra"

**Ação**:
- URL: `https://unnichat.com.br/a/start/uqsS0xdnLNdWleMeYhv8`
- Envia para Conexão "Closer"

---

## 🔀 Diagrama de Decisão

```mermaid
graph TD
    A[Webhook Recebido] --> B{Tipo de Agendamento}
    
    B -->|Ligação Closer| C[Edit Fields]
    C --> D{Verificar Evento}
    D -->|Instagram| E[Fluxo Instagram]
    D -->|WhatsApp| F[Fluxo WhatsApp]
    D -->|On The Road| G[Fluxo On The Road]
    D -->|Agendamento Direto| H[Enviar para Closer]
    D -->|Outros| I[Enviar para SDR]
    
    B -->|Ligação SDR| J[Edit Fields 1]
    J --> I[Enviar para SDR]
    
    B -->|Upgrade| K[Edit Fields 2]
    K --> D
    
    B -->|Reagendamento Closer| L[Edit Fields 3]
    L --> D
    
    B -->|Agendamento Pessoal| M[Edit Fields 4]
    M --> N{É Pausa Extra?}
    N -->|Sim| O[Não envia]
    N -->|Não| H
    
    E --> P[Pesquisar Lead]
    P --> Q[Adicionar Tag]
    Q --> R[Preencher Campos]
    
    F --> S[Enviar WhatsApp]
    
    G --> T[Enviar Aldeia]
    T --> U[Enviar Closer]
```

---

## 🔑 Autenticação e Credenciais

### **UnniChat API**
- **Token de Autorização**: `dbb05cd6-b607-41f0-b7f8-0dc36a0c0f6f`
- **Base URL**: `https://unnichat.com.br/`

### **Webhooks TradeSpot 2.0**
- **Base URL**: `https://n8n.tradestars.com.br/webhook/`

---

## 📝 IDs de Recursos UnniChat

### **Tags**
| Nome | ID |
|------|-----|
| confirmação_de_agendamento | `019b9a25-5983-77a3-ab67-7ceae852f831` |

### **Campos Personalizados (Custom Fields)**
| Nome | ID |
|------|-----|
| Negociando | `JuflZgDJZc4R4vSVsRDQ` |
| Data do Agendamento | `IIc2eyqN7Ub2tLl4Un17` |
| Link Meet | `PHvAUXF2XetVXaeqNMWQ` |

### **Conexões (Start Points)**
| Nome | ID/URL |
|------|--------|
| SDR | `4GcRfvQTuFTc1plOx42Y` |
| Closer | `uqsS0xdnLNdWleMeYhv8` |
| Social Seller (WhatsApp) | `sVtfbOOyLHk5IrXwMrOy` |
| Aldeia (On The Road) | `u8h2gcbp5gwShJmEUAYW` |
| Closer (On The Road) | `4WCBo2j3JI3kms39aYSU` |

---

## 🛠️ Configuração dos Webhooks no TradeSpot 2.0

Para cada tipo de agendamento, configure o webhook correspondente:

### **Ligação Closer**
```
URL: https://n8n.tradestars.com.br/webhook/fef2183b-d765-40f0-9841-eac5e368cedc
Método: POST
Content-Type: application/json
```

### **Ligação SDR**
```
URL: https://n8n.tradestars.com.br/webhook/a28b6ded-a788-4ccb-b4e1-7a526340dcba
Método: POST
Content-Type: application/json
```

### **Upgrade**
```
URL: https://n8n.tradestars.com.br/webhook/dedb7d8d-9d21-464b-a612-365cbf973927
Método: POST
Content-Type: application/json
```

### **Reagendamento Closer**
```
URL: https://n8n.tradestars.com.br/webhook/577bc264-f047-41df-9253-70b1bcc25421
Método: POST
Content-Type: application/json
```

### **Agendamento Pessoal**
```
URL: https://n8n.tradestars.com.br/webhook/ee6b4b33-b977-4585-a1ca-526ee6e357f1
Método: POST
Content-Type: application/json
```

---

## ⚙️ Configurações do Workflow

- **Estado**: Ativo (`active: true`)
- **Ordem de Execução**: v1
- **ID do Workflow**: `4XpnERxEm9VytY2r`
- **Version ID**: `169ac93c-d7f9-443f-8c2c-13ded3956b9a`

---

## 🧪 Exemplo de Payload de Teste

```json
{
  "headers": {
    "accept": "application/json, text/plain, */*",
    "content-type": "application/json"
  },
  "body": {
    "id": "5c94d24d-d24c-41e0-880b-28fedb20e567",
    "client_id": "46f228d5-a01e-4b7c-a35d-7b065a6566f7",
    "date": "2026-01-12",
    "time": "18:30:00+00",
    "type": "Agendamento Pessoal",
    "status": "Pendente",
    "meet_link": "https://meet.google.com/svc-tgxb-mnk",
    "notes": "",
    "additional_info": "",
    "created_at": "2026-01-12T13:02:56.145+00:00",
    "interest_level": "Alto",
    "knowledge_level": "Iniciante",
    "financial_currency": "BRL",
    "financial_amount": 111,
    "end_time": "19:30:00+00",
    "google_event_id": "6123hjjjohrv1oelkqqaig0to0",
    "lead": "Teste Leonardo",
    "phone": "5541998618483",
    "email": "teste@tradestars.com.br",
    "attendant_name": "Leonardo Henrique",
    "created_by_name": "Leonardo Henrique",
    "event_name": "Pausa Extra"
  }
}
```

---

## 📋 Checklist de Manutenção

- [ ] Verificar se todos os webhooks estão respondendo corretamente
- [ ] Validar se as credenciais do UnniChat estão ativas
- [ ] Conferir se os IDs de campos personalizados estão atualizados
- [ ] Testar cada fluxo de evento individualmente
- [ ] Monitorar logs de erro no n8n
- [ ] Verificar se as tags estão sendo aplicadas corretamente
- [ ] Validar formatação de data/hora

---

## 🐛 Troubleshooting

### **Webhook não está sendo acionado**
- Verifique se o workflow está ativo no n8n
- Confirme se a URL do webhook está correta no TradeSpot 2.0
- Verifique logs de erro no servidor n8n

### **Lead não encontrado no UnniChat**
- Confirme se o email do lead está correto
- Verifique se o lead existe no sistema UnniChat
- Valide as credenciais de API

### **Tags/Campos não estão sendo preenchidos**
- Confirme se os IDs dos campos personalizados estão corretos
- Verifique permissões do token de autenticação
- Valide estrutura dos dados enviados

### **Conexões não estão recebendo dados**
- Verifique se as URLs das conexões estão corretas
- Confirme se os parâmetros estão sendo enviados corretamente
- Valide logs de execução do workflow

---

## 📅 Histórico de Alterações

| Data | Versão | Descrição |
|------|--------|-----------|
| 2026-01-26 | 1.0 | Documentação inicial do workflow |

---

## 👥 Responsáveis

- **Desenvolvimento**: Equipe TradeStars
- **Manutenção**: Equipe de Desenvolvimento TradeSpot 2.0
- **Suporte**: n8n.tradestars.com.br

---

## 📞 Suporte

Para dúvidas ou problemas relacionados a este workflow, entre em contato com a equipe de desenvolvimento TradeStars.

---

**Última atualização**: 26/01/2026
