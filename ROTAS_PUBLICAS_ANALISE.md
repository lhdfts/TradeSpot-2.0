# Análise das Rotas Públicas - Rate Limiting

## 📋 Resumo Executivo

Existem **4 rotas públicas** no sistema. Cada uma é acionada em momentos diferentes do fluxo de agendamento. Abaixo está a análise detalhada de quando cada uma é chamada e quantas vezes.

---

## 🔍 Detalhamento de Cada Rota

### 1️⃣ **GET `/api/public/events/:link`**

**O que faz:**
- Busca informações do evento (nome, setor, ID) usando o link único do evento

**Quando é acionada:**
- ✅ **Ao carregar a página de agendamento** (1 vez no início)
- Exemplo: `GET /api/public/events/ef559366-67bb-4cd1-9607-1e3b6d465ba7`

**Tipo de operação:** 
- 📖 **LEITURA** (sem modificação de dados)

**Frequência esperada por usuário:**
- **1 vez por sessão** (quando abre o link de agendamento)

**Dados retornados:**
```json
{
  "id": "uuid",
  "event_name": "Primeiro Dólar na Prática",
  "sector": "Perpétuos",
  "duration": 60
}
```

**Risco de abuso:**
- ⚠️ **Baixo** - Apenas leitura, não cria dados
- Possível abuso: Scraping de informações de eventos

**Recomendação de limite:**
- 💡 **50-100 requisições por 15 minutos** (muito generoso)
- Ou **sem limite** (é apenas leitura)

---

### 2️⃣ **GET `/api/public/available-times`**

**O que faz:**
- Busca os horários disponíveis para uma data específica
- Verifica schedule dos atendentes, conflitos de agendamentos, pausas, etc.

**Quando é acionada:**
- ✅ **Ao selecionar uma data** no formulário
- Exemplo: `GET /api/public/available-times?date=2026-03-06&eventId=...`

**Tipo de operação:**
- 📖 **LEITURA** (sem modificação de dados)
- ⚠️ **Operação pesada** (faz várias consultas ao banco)

**Frequência esperada por usuário:**
- **Múltiplas vezes** (cada vez que muda a data)
- Típico: 3-5 vezes por sessão de agendamento

**Dados retornados:**
```json
{
  "date": "2026-03-06",
  "availableTimes": ["09:00", "09:15", "09:30", ...]
}
```

**Risco de abuso:**
- ⚠️ **Médio** - Operação pesada, pode sobrecarregar BD
- Possível abuso: Fazer muitas consultas para sobrecarregar servidor

**Recomendação de limite:**
- 💡 **30-50 requisições por 15 minutos** (moderado)
- Ou **sem limite** (usuários legítimos consultam múltiplas datas)

---

### 3️⃣ **POST `/api/public/appointments`**

**O que faz:**
- Cria um novo agendamento no sistema
- Valida dados, busca melhor atendente, cria cliente, envia webhook

**Quando é acionada:**
- ✅ **Ao clicar em "Confirmar Agendamento"**
- Exemplo: `POST /api/public/appointments` com dados do formulário

**Tipo de operação:**
- ✏️ **ESCRITA** (cria dados no banco)
- ⚠️ **Operação crítica** (afeta dados permanentes)

**Frequência esperada por usuário:**
- **1-2 vezes por sessão** (normalmente 1 vez)
- Múltiplas tentativas se houver erro

**Dados enviados:**
```json
{
  "lead": "Nome do Cliente",
  "email": "email@example.com",
  "phone": "5511999999999",
  "date": "2026-03-06",
  "time": "09:00",
  "eventId": "uuid",
  "attendantId": "distribuicao_automatica"
}
```

**Risco de abuso:**
- 🔴 **ALTO** - Cria dados permanentes no banco
- Possível abuso: Spam de agendamentos falsos, DoS

**Recomendação de limite:**
- ✅ **2-3 agendamentos por hora** (RESTRITIVO)
- **Atual:** 2 agendamentos/hora ✅ (Você já ajustou!)

---

### 4️⃣ **GET `/api/public/debug/available-times`**

**O que faz:**
- Endpoint de DEBUG que retorna informações detalhadas sobre atendentes e agendamentos
- Mostra schedule, se tem conflitos, etc.

**Quando é acionada:**
- ✅ **Manualmente para debugging** (não é usado pelo frontend)
- Exemplo: `GET /api/public/debug/available-times?date=2026-03-06&eventId=...`

**Tipo de operação:**
- 📖 **LEITURA** (sem modificação de dados)
- ⚠️ **Expõe informações sensíveis** (schedule dos atendentes)

**Frequência esperada:**
- **Raramente** (apenas para debugging/troubleshooting)

**Dados retornados:**
```json
{
  "date": "2026-03-06",
  "eventId": "uuid",
  "sectors": ["Perpétuos"],
  "appointmentType": "Gold Call",
  "attendantsFound": 3,
  "attendants": [
    {
      "id": "uuid",
      "name": "Leonardo",
      "sector": "Perpétuos",
      "hasSchedule": true,
      "schedule": {...}
    }
  ],
  "appointmentsFound": 2,
  "appointments": [...]
}
```

**Risco de abuso:**
- 🔴 **ALTO** - Expõe informações sensíveis (schedule dos atendentes)
- Possível abuso: Scraping de dados internos

**Recomendação de limite:**
- ⚠️ **REMOVER ou PROTEGER** (não deveria ser pública)
- Ou: **5-10 requisições por 15 minutos** (muito restritivo)

---

## 📊 Tabela Comparativa

| Rota | Tipo | Frequência | Risco | Limite Recomendado |
|------|------|-----------|-------|-------------------|
| `GET /events/:link` | Leitura | 1x/sessão | Baixo | 50-100/15min ou sem limite |
| `GET /available-times` | Leitura (pesada) | 3-5x/sessão | Médio | 30-50/15min ou sem limite |
| `POST /appointments` | Escrita | 1-2x/sessão | ALTO | **2-3/hora** ✅ |
| `GET /debug/available-times` | Leitura (sensível) | Raramente | ALTO | Remover ou 5-10/15min |

---

## 🎯 Recomendações Finais

### Prioridade 1 - CRÍTICO ✅
- **`POST /appointments`**: Manter em **2 agendamentos/hora**
- Razão: Protege contra spam de agendamentos

### Prioridade 2 - IMPORTANTE
- **`GET /debug/available-times`**: **REMOVER ou PROTEGER**
- Razão: Expõe dados sensíveis (schedule dos atendentes)
- Alternativa: Mover para rota autenticada (`/api/appointments/debug/...`)

### Prioridade 3 - OPCIONAL
- **`GET /available-times`**: Considerar **30-50 requisições/15min**
- Razão: Operação pesada, mas usuários legítimos consultam múltiplas datas
- Ou: Deixar sem limite se o servidor aguenta

### Prioridade 4 - BAIXA
- **`GET /events/:link`**: **Sem limite ou 50-100/15min**
- Razão: Apenas leitura, baixo risco

---

## 💡 Fluxo Típico de um Usuário

```
1. Abre link de agendamento
   └─> GET /api/public/events/:link (1 requisição)

2. Seleciona primeira data
   └─> GET /api/public/available-times (1 requisição)

3. Muda para segunda data
   └─> GET /api/public/available-times (1 requisição)

4. Muda para terceira data
   └─> GET /api/public/available-times (1 requisição)

5. Clica em "Confirmar Agendamento"
   └─> POST /api/public/appointments (1 requisição)

TOTAL: 5 requisições por agendamento bem-sucedido
```

**Com 2 agendamentos por hora:**
- Usuário pode fazer até **10 requisições por hora** (5 req × 2 agendamentos)
- Isso é **razoável** para uso legítimo

---

## 🔐 Considerações de Segurança

### Dados Sensíveis Expostos
- ⚠️ `/debug/available-times` expõe **schedule completo dos atendentes**
- Recomendação: **Remover ou proteger com autenticação**

### Proteção contra Abuso
- ✅ Rate limiter em `/appointments` previne spam
- ⚠️ `/available-times` poderia ser abusada para DoS (operação pesada)
- 💡 Considerar cache de 5-10 minutos para `/available-times`

### IP Spoofing
- ⚠️ Rate limiter usa IP do cliente
- Com proxy reverso (Vercel), precisa de `app.set('trust proxy', 1)` ✅ (já configurado)

