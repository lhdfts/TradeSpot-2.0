# Automatic Distribution System - Complete Documentation

## Overview

The automatic distribution system is a load-balancing mechanism that automatically assigns attendants to appointments when users create **"Ligação Closer"** or **"Agendamento Pessoal"** appointments without manually selecting an attendant.

**Location in Code:** Lines 11187-11308 (`findAvailableCloser()` function)

---

## When Distribution is Triggered

The automatic distribution is activated when:

1. Appointment type is either:
   - `'Ligação Closer'` (Closer Call)
   - `'Agendamento Pessoal'` (Personal Appointment)

2. Attendant value is set to `'distribuicao_automatica'`

**Code Location:** Line 11885

```javascript
if ((appointmentData.appointmentType === 'Ligação Closer' || 
     appointmentData.appointmentType === 'Agendamento Pessoal') && 
    appointmentData.attendant === 'distribuicao_automatica') {
    // Trigger automatic distribution
}
```

---

## Core Function: `findAvailableCloser()`

**Location:** Line 11190

This is the main function that handles the entire distribution logic. It takes two parameters:
- `appointmentDate` - Date in DD/MM/YYYY format
- `appointmentTime` - Time in HH:MM format

### Return Value
- **Success:** Returns an attendant object with their details
- **Failure:** Returns `null` (triggers error notification)

---

## Distribution Algorithm - Step by Step

### Step 1: Filter by Sector

**Purpose:** Only Sales department attendants are eligible for distribution

```javascript
let closers = attendantsData.filter(attendant => {
    const sector = (attendant.setor || '').toLowerCase().trim();
    return sector === 'vendas';
});
```

**Validation:**
- Checks `attendant.setor` field
- Case-insensitive comparison
- Returns `null` if no Sales attendants exist

---

### Step 2: Filter by Schedule Configuration

**Purpose:** Only attendants with configured hours for the specific day can be assigned

**Process:**
1. Convert appointment date from `DD/MM/YYYY` to JavaScript Date object
2. Determine day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
3. Map day number to field names:
   - Monday → `segunda_horario_inicio`, `segunda_horario_fim`
   - Tuesday → `terca_horario_inicio`, `terca_horario_fim`
   - Wednesday → `quarta_horario_inicio`, `quarta_horario_fim`
   - Thursday → `quinta_horario_inicio`, `quinta_horario_fim`
   - Friday → `sexta_horario_inicio`, `sexta_horario_fim`
   - Saturday → `sabado_horario_inicio`, `sabado_horario_fim`
   - Sunday → `domingo_horario_inicio`, `domingo_horario_fim`

4. Check if both start and end times are configured (not null/empty)

**Code Location:** Lines 11202-11225

**Validation:**
- Returns `null` if no attendants have schedules for that day

---

### Step 3: Calculate Workload

**Purpose:** Count pending appointments for each attendant on the specific date

**Critical Detail:** 
- **"Agendamento Pessoal" (Personal Appointments) are EXCLUDED from the count**
- However, they still **block time slots** (verified in conflict check)
- This means: Personal appointments don't contribute to workload but do occupy the time slot

**Counting Logic (Lines 11233-11269):**

For each attendant, count appointments where:
- ✅ Attendant name matches (case-insensitive)
- ✅ Date matches the appointment date
- ✅ Status is `'Pendente'` (Pending)
- ❌ Type is NOT `'Agendamento Pessoal'` ← **Excluded**

```javascript
const appointmentCount = appointmentsData.filter(appointment => {
    const nameMatcher = (appointment.attendant || '').toLowerCase().trim() 
        === closer.nome.toLowerCase().trim();
    const dateMatcher = appointmentDateNormalized === existingDateNormalized;
    const statusMatcher = (appointment.status || '').toLowerCase().trim() === 'pendente';
    const typeMatcher = (appointment.type || '').toLowerCase().trim() !== 'agendamento pessoal';
    
    return nameMatcher && dateMatcher && statusMatcher && typeMatcher;
}).length;
```

**Result:** Each attendant gets an `appointmentCount` value

---

### Step 4: Sort by Workload

**Purpose:** Order attendants by their current load (lowest first)

**Algorithm (Lines 11273-11280):**

1. Sort ascending by `appointmentCount` (lowest workload first)
2. If two attendants have the same count, **randomly shuffle them**
3. This ensures fair distribution when workloads are equal

```javascript
const closersOrderedByLoad = closersWithCount.sort((a, b) => {
    if (a.appointmentCount !== b.appointmentCount) {
        return a.appointmentCount - b.appointmentCount;
    }
    // Tiebreaker: random selection
    return Math.random() - 0.5;
});
```

**Console Output:**
```
[DISTRIBUTION] Closers ordenados por carga: João(2) → Maria(3) → Pedro(2)
```

---

### Step 5: Iterate and Validate Each Attendant

**Purpose:** Find the first attendant that passes all validations

**Process (Lines 11286-11304):**

For each attendant in the sorted list, perform two critical checks:

#### Check A: Schedule Validation

**Function:** `isAttendantWithinSchedule()` (Line 11007)

**Validates:**
- Is the appointment time within the attendant's working hours?
- Is the attendant NOT on break during that time?

**Process:**
1. Get attendant's start time, end time, break start, and break end for that day
2. Convert all times to minutes for precise comparison
3. Check: `entryMinutes ≤ appointmentMinutes < exitMinutes`
4. Check: NOT in break period (`pauseStartMinutes ≤ appointmentMinutes < pauseEndMinutes`)

**Code Location:** Lines 11007-11076

**Example:**
```
Attendant: João
Day: Tuesday
Working Hours: 09:00 - 18:00
Break: 12:00 - 13:00
Requested Time: 10:00

Result: ✅ VALID (within working hours, not on break)
```

#### Check B: Conflict Detection

**Function:** `hasConflictingAppointment()` (Line 11081)

**Validates:**
- Does the attendant already have an appointment at this time?
- **Considers ALL appointment types** (including "Agendamento Pessoal")

**Key Details:**
- Each appointment occupies exactly **30 minutes**
- Conflict detection uses time overlap logic:
  - New appointment: `[appointmentTime, appointmentTime + 30]`
  - Existing appointment: `[existingTime, existingTime + 30]`
  - Conflict if: `newStart < existingEnd AND newEnd > existingStart`

**Code Location:** Lines 11081-11185

**Filtering Criteria:**
- ✅ Attendant name matches (case-insensitive)
- ✅ Date matches (accepts both DD/MM/YYYY and YYYY-MM-DD formats)
- ✅ Status is `'Pendente'` (only active appointments block time)
- ✅ Time overlaps with requested slot

**Example:**
```
Attendant: João
Date: 15/01/2025
Requested Time: 10:00 (occupies 10:00-10:30)

Existing Appointments:
- 09:00-09:30: ✅ No conflict (ends before 10:00)
- 10:00-10:30: ❌ CONFLICT (exact overlap)
- 10:15-10:45: ❌ CONFLICT (overlaps)
- 10:30-11:00: ✅ No conflict (starts at end time)

Result: CONFLICT DETECTED
```

---

### Step 6: Return First Available Attendant

**Purpose:** Assign the first attendant that passes both validations

**Process (Lines 11301-11304):**

```javascript
// Attendant available found
console.log(`[DISTRIBUTION] ✅ ${closer.nome} atribuído (carga: ${closer.appointmentCount})`);
return closer;
```

**If No Attendant Found:**
```javascript
console.warn(`[DISTRIBUTION] ❌ Nenhum closer disponível`);
return null;
```

---

## Post-Distribution Assignment

### Attendant Assignment (Line 11934)

Once an available attendant is found:

```javascript
appointmentData.attendant = availableCloser.nome;
```

### User Notification (Lines 11938-11941)

```javascript
showNotification(
    `Agendamento será criado com ${availableCloser.nome}`,
    'info'
);
```

---

## Critical Validation

### Pre-Submission Check (Line 11945)

Before the appointment is submitted to n8n, the system validates:

```javascript
if (!appointmentData.attendant || 
    appointmentData.attendant === '' || 
    appointmentData.attendant === 'distribuicao_automatica') {
    console.error('[VALIDATION] ❌ Atendente inválido ou vazio:', appointmentData.attendant);
    showNotification('Erro: Atendente não foi atribuído. Por favor, tente novamente.', 'error');
    isProcessingAppointment = false;
    return;
}
```

**This ensures:**
- The attendant field is NEVER empty
- The attendant field is NEVER still set to `'distribuicao_automatica'`
- The appointment cannot be created without a valid attendant

---

## System Characteristics Summary

| Aspect | Behavior |
|--------|----------|
| **Eligible Attendants** | Only Sales sector (`setor === 'vendas'`) |
| **Load Metric** | Pending appointments excluding "Agendamento Pessoal" |
| **Time Blocking** | All appointment types block time slots |
| **Tiebreaker Strategy** | Random selection when workloads are equal |
| **Slot Duration** | 30 minutes per appointment |
| **Validation Checks** | Schedule + Conflict detection |
| **Fallback Behavior** | Error notification if no one available |
| **Data Freshness** | Uses current `appointmentsData` array (includes locally created appointments) |

---

## Real-World Example Scenario

**Scenario:** Creating a "Ligação Closer" appointment for 15/01/2025 at 10:00

### Initial State
```
Sales Attendants:
1. João - 2 pending appointments on 15/01
2. Maria - 3 pending appointments on 15/01
3. Pedro - 2 pending appointments on 15/01
```

### Step 1: Sector Filter
```
✅ All 3 are in Sales sector
Remaining: João, Maria, Pedro
```

### Step 2: Schedule Check
```
Date: 15/01/2025 (Tuesday)
All 3 have Tuesday hours configured:
- João: 09:00-18:00
- Maria: 09:00-18:00
- Pedro: 09:00-18:00
✅ All pass
Remaining: João, Maria, Pedro
```

### Step 3: Workload Calculation
```
João: 2 pending (excluding Personal)
Maria: 3 pending (excluding Personal)
Pedro: 2 pending (excluding Personal)
```

### Step 4: Sort by Load
```
Sorted: [João(2), Pedro(2), Maria(3)]
Note: João and Pedro tied at 2, so random order between them
```

### Step 5: Validate Each

**Checking João:**
- Schedule: 10:00 is within 09:00-18:00 ✅
- No break at 10:00 ✅
- Conflict check: No existing appointment at 10:00 ✅
- **Result: AVAILABLE** ✅

### Step 6: Assignment
```
João is assigned to the appointment
User sees: "Agendamento será criado com João"
```

---

## Console Logging

The system provides detailed console logs for debugging:

```javascript
[DISTRIBUTION] Buscando closer disponível com dados atualizados...
[DISTRIBUTION] Total de agendamentos no array local: 45
[DISTRIBUTION] Agendamentos pendentes no mesmo horário: 0
[DISTRIBUTION] Closers ordenados por carga: João(2) → Maria(3) → Pedro(2)
[DISTRIBUTION] João(2) descartado: fora do horário de escala
[DISTRIBUTION] ✅ Maria atribuído (carga: 3)
```

---

## Error Scenarios

### Scenario 1: No Sales Attendants
```
Result: null
Error: "Todos os closers estão ocupados neste horário..."
```

### Scenario 2: No Attendants with Schedule for That Day
```
Result: null
Error: "Todos os closers estão ocupados neste horário..."
```

### Scenario 3: All Attendants Outside Working Hours
```
Result: null
Error: "Todos os closers estão ocupados neste horário..."
```

### Scenario 4: All Attendants Have Time Conflicts
```
Result: null
Error: "Todos os closers estão ocupados neste horário..."
```

---

## Important Notes

1. **"Agendamento Pessoal" Special Handling:**
   - Excluded from workload counting
   - Still blocks time slots (prevents double-booking)
   - This allows personal appointments to not affect load distribution

2. **Data Freshness:**
   - Uses current `appointmentsData` array
   - Includes appointments created locally but not yet saved to server
   - Prevents double-booking of locally created appointments

3. **Case-Insensitive Matching:**
   - All attendant name comparisons are case-insensitive
   - Handles variations in data entry

4. **Date Format Flexibility:**
   - Accepts both DD/MM/YYYY and YYYY-MM-DD formats
   - Automatically normalizes for comparison

5. **30-Minute Duration:**
   - All appointments are assumed to occupy exactly 30 minutes
   - Used for conflict detection calculations

---

## Related Functions

- **`isAttendantWithinSchedule()`** (Line 11007) - Validates schedule and break times
- **`hasConflictingAppointment()`** (Line 11081) - Detects time conflicts
- **`formatTimeFromSupabase()`** (Line 11351) - Converts time format from Supabase
- **`handleFormSubmit()`** (Line 11737+) - Main form submission handler that triggers distribution
