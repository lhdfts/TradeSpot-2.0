# Security and Validation Specification - Backend (Node.js/Express)

**Context:** Appointment System (React/Vite Frontend + Node/Express Backend).
**Objective:** Protection against XSS, SQL Injection, HTML Injection, and data manipulation via Inspect Element.

---

## 1. Security Principles (Defense Layer)

All requests reaching the server must pass through three stages before interacting with the database:

1.  **Sanitize:** Remove dangerous HTML tags from free-text fields (prevention of XSS).
2.  **Validate:** Immediately reject any data that does not follow the strict format defined below (prevention of data injection and logical errors).
3.  **ORM / Prepared Statements:** Never concatenate SQL strings manually. Use an ORM (Prisma/TypeORM) to prevent SQL Injection.

> **Golden Rule:** "Never Trust Client Input". Even if the frontend validates, the backend must re-validate everything, as the frontend can be bypassed or manipulated.

---

## 2. Validation Rules by Field

### A. Search Fields (General)
Applicable to: *My Appointments*, *All Appointments*.

* **Rule:** Allow only letters (Portuguese Alphabet/Latin), numbers, `@`, `.`, `-`, and `_`.
* **Action:** Reject the request if it contains characters like `<`, `>`, `'`, `"`, `;`.
* **Suggested Regex:** `/^[a-zA-Z\u00C0-\u00FF0-9@.\-_]+$/`

### B. Create Appointment Form

#### 1. Phone
* **Rule:** Numbers only.
* **Treatment:** The backend must remove any mask sent by the frontend.
* **Regex:** `/^\d+$/`

#### 2. Student (Name)
* **Rule:** Letters (Portuguese Alphabet) and spaces.
* **Restriction:** Do not allow two consecutive spaces or a space at the end of the string.
* **Regex:** `/^[a-zA-Z\u00C0-\u00FF]+(?:\s[a-zA-Z\u00C0-\u00FF]+)*$/`

#### 3. Email
* **Rule:** Standard email format containing only letters, numbers, `@`, `.`, `-`, `_`.
* **Validation:** `z.string().email()` + verification against injection characters (`'`, `;`).

#### 4. Dropdowns (Selectors)
* **Fields:** *Interest Profile, Currency, Knowledge Profile, Event, Type.*
* **Anti-Manipulation Security:** The received value **must** belong to a pre-defined list (Enum or Database Table).
* **Action:** If the value does not exist in the allowed ID list, reject the request (prevents editing via HTML value).

#### 5. Financial Profile (Value)
* **Rule:** Positive numbers only.
* **Treatment:** If received as a formatted string ("1.000,00"), sanitize to float/decimal before saving.

#### 6. Date
* **Rule:** Format `dd/mm/yyyy`.
* **Logical Validation:** The date must be valid (exist in the calendar) and respect business rules (e.g., do not allow past dates, if applicable).

#### 7. Time (Start)
* **Rule:** Format `HH:mm`.
* **Interval:** Only minutes `00`, `15`, `30`, `45`.
* **Conflict Check:** The backend must query the database: *"Is there an existing appointment for this Agent at this time?"*. If yes, return an error.

#### 8. End Time (Critical)
* **Security Rule:** The backend must **IGNORE** this field coming from the frontend.
* **Logic:** The end time must be calculated exclusively on the server: `End Time = Start Time + Duration of Appointment Type`.

#### 9. Additional Information
* **Rule:** Letters, numbers, `@`, `.`, `(`, `)`, single and double quotes.
* **Treatment:** Escape quotes (`'` -> `\'`) when saving to the database to prevent breaking SQL queries or injection.

#### 10. Agent (Attendant)
* **Logical Security:**
    * If `Type == Upgrade`: Validate if the sent ID belongs to a valid agent.
    * If `Type != Upgrade`: **Ignore** the sent ID and use the server's automatic distribution logic.

---

## 3. Technical Implementation (Zod Example)

Suggested validation schema for use with the **Zod** library in TypeScript.

```typescript
import { z } from 'zod';

// Regex for names (Letters, no double spaces/trailing spaces)
const nameRegex = /^[a-zA-Z\u00C0-\u00FF]+(?:\s[a-zA-Z\u00C0-\u00FF]+)*$/;

// Example Enums (Should come from the database or system constants)
const VALID_TYPES = ['Reagendamento', 'Upgrade', 'Ligação Closer'] as const;
const VALID_CURRENCIES = ['BRL', 'USD', 'EUR'] as const;

export const createAppointmentSchema = z.object({
  // Strict number validation
  phone: z.string().regex(/^\d+$/, "Only numbers are allowed"),
  
  // Name validation
  student: z.string().regex(nameRegex, "Invalid name (check for double spaces)"),
  
  // Secure email validation
  email: z.string()
    .email("Invalid email")
    .regex(/^[\w\-\.@]+$/, "Invalid characters in email"),
    
  // IDs (Validate UUID format or similar)
  interest_profile_id: z.string().uuid(),
  knowledge_profile_id: z.string().uuid(),
  event_id: z.string().uuid(),
  
  // Strict Enums
  currency: z.enum(VALID_CURRENCIES),
  type: z.enum(VALID_TYPES),
  
  // Numbers
  value: z.number().positive(), 
  
  // Date DD/MM/YYYY
  date: z.string().refine((val) => /^\d{2}\/\d{2}\/\d{4}$/.test(val), "Invalid format"),
  
  // Time (00, 15, 30, 45)
  time: z.string().regex(/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/, "Invalid time"),
  
  // NOTE: 'end_time' is NOT included here so it gets stripped/ignored.
  
  // Controlled free text
  additional_info: z.string()
    .max(300)
    .regex(/^[a-zA-Z\u00C0-\u00FF0-9@.()\s"'-]*$/, "Special characters not allowed")
    .optional(),

  // Optional because it depends on business logic (Auto vs Manual)
  agent_id: z.string().uuid().optional(), 
});