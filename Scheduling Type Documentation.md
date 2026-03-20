# Scheduling Type Documentation

This document describes each scheduling type in the system, its purpose, verification logic, and assignment rules.

---

## 1. **Ligação SDR**

### Purpose
A call scheduling created by SDR (Sales Development Representative) team members to contact leads and qualify them for sales opportunities.

### Agent Assignment
- **Automatically assigned to the user creating the scheduling**
- The agent field is **disabled** after selection; there is no possibility for the SDR to create this scheduling for another SDR.

### Time Availability
- Respects the agent's work schedule
- Checks for scheduling conflicts (30-minute duration)
- Allows scheduling from the current moment (if the booking is made today)

### Main Features
- ✅ Simple 1:1 mapping (SDR creates → SDR is assigned)
- ✅ Does not require automatic distribution selection
- ✅ Direct responsibility for the call

### Only users with sector = SDR can view and create this type of appointment on the Create Appointments screen

---

## 2. **Ligação Closer**

### Objective
A scheduled call for the sales closing team to follow up on qualified leads and close deals.

### Agent Assignment

**If the user is in the "Closer" sector:**
- Automatically assigned to the logged-in user (the agent who created the assignment)
- The agent field is **disabled** for manual selection

**If the user is NOT in the "Closer" sector:**
- Uses the **Automatic Distribution System**
- Distributes equally among available agents
- Selects the agent with the fewest appointments on the selected date
- In case of a tie in the total number of appointments, randomly distributes only among those with the fewest appointments on that day.

### Time Availability
- **Always updates agent data** before generating available times
- Filters only agents (sector = "Closer")
- Checks each agent's individual schedule
- Detects scheduling conflicts (45-minute duration)
- Allows scheduling from the current time

### Main Features
- ✅ Fair load balancing among Closers
- ✅ Respects individual schedules
- ✅ Prevents duplicate bookings

### Only users with sector = SDR or Closer can view and create this type of appointment on the Create Appointments screen

---

## 3. **Agendamento Pessoal**

### Purpose
A type of personal appointment, generally for internal meetings, training, or personal scheduling needs.

### Agent Assignment

- Automatically assigns to the user creating the appointment
- The agent field is **disabled** for manual selection

### Time Availability
- Respects the agent's work schedule
- Checks for conflicts (45-minute duration)
- Allows scheduling from the current time

### Main Features
- ✅ Flexible scheduling
- ✅ Can be assigned to any team member

### Only users with sector = Closer can view and create this type of appointment on the Create Appointments screen

---

## 4. **Reagendamento Closer**

### Purpose
Reschedule a contact for leads who have already had a Closer call but need to be contacted again. (45-minute duration)

### Attendant Assignment

**Automatic search by phone number:**
1. Searches for previous appointments with the same phone number
2. Searches by type: "Ligação Closer", "Agendamento Pessoal" or "Reagendamento Closer"
3. Selects the **most recent appointment** by date and time
4. Assigns the **same Attendant** from the previous appointment
5. Shows only available times based on the Closer's schedule.

### Validation Requirements
- ✅ **Phone number is required** - must be filled in before an agent can be assigned
- ✅ **Previous appointment must exist** - rescheduling is not possible without prior contact
- ✅ **Previous appointment must have an agent** - ensures continuity

### Error Scenarios
- ❌ Phone not found: display popup message in the upper right corner stating “Não foram encontrados agendamentos anteriores para o telefone informado”

### Only users with sector = SDR or Closer can view and create this type of appointment on the Create Appointments screen

## 5. **Upgrade**

### Purpose
An upgrade appointment for leads that want to upgrade their existing service or package.

### Attendant Assignment
- **User must manually select a Closer** from a dropdown
- Field is **enabled** (not auto-filled)
- Only shows Closers from the "Closer" sector

### Time Slot Availability
- **Always refreshes attendants data** before generating time slots
- Respects the selected Closer's schedule
- Checks for conflicts
- Dynamically updates when a different Closer is selected

### Key Features
- ✅ Manual Closer selection
- ✅ Shows all Closers
- ✅ Requires explicit choice
- ✅ Respects individual schedules


