import { z } from 'zod';

// Regex for names (Letters, no double spaces/trailing spaces)
const nameRegex = /^[a-zA-Z\u00C0-\u00FF]+(?:\s[a-zA-Z\u00C0-\u00FF]+)*$/;

// Example Enums (Should strictly match database if possible, but hardcoded for now based on system constants)
const VALID_TYPES = ['Ligação SDR', 'Ligação Closer', 'Agendamento Pessoal', 'Reagendamento Closer', 'Upgrade'] as const;
const VALID_CURRENCIES = ['BRL', 'USD', 'EUR', 'JPY'] as const;
const VALID_INTEREST_LEVELS = ['Alto', 'Mediano', 'Desconhecido'] as const;
const VALID_KNOWLEDGE_LEVELS = ['Iniciante', 'Intermediário', 'Avançado'] as const;

export const createAppointmentSchema = z.object({
    // Strict number validation (Backend removes mask, but we validate strictly numbers)
    phone: z.coerce.string()
        .regex(/^\d+$/, "O telefone deve conter apenas números")
        .min(8, "O telefone informado é muito curto")
        .max(20, "O telefone informado é muito longo"),

    // Name validation
    lead: z.string()
        .regex(nameRegex, "Nome inválido (verifique espaços duplos)")
        .max(100, "Nome muito longo"),

    // Secure email validation
    email: z.string()
        .email("Invalid email")
        .regex(/^[\w\-\.@]+$/, "Invalid characters in email"),

    // IDs (Validate UUID format or similar) - Assuming UUIDs for Supabase IDs
    // If your system uses int IDs for some tables, adjust accordingly. 
    // Based on context: Attendant is UUID, Event is UUID/int? Let's assume UUID for new entries, but current system might have legacy.
    // We'll use string() generally if ensuring UUID is blocked by unknown schema.
    eventId: z.string().min(1, "Event is required"),

    // Strict Enums
    studentProfile: z.object({
        financial: z.object({
            currency: z.enum(VALID_CURRENCIES),
            amount: z.string().or(z.number()) // Can come as formatted string or number, we'll sanitize
        }),
        interest: z.enum(VALID_INTEREST_LEVELS),
        knowledge: z.enum(VALID_KNOWLEDGE_LEVELS)
    }),

    type: z.enum(VALID_TYPES),

    // Date DD/MM/YYYY
    // We refine to ensure strict format.
    date: z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val) || /^\d{2}\/\d{2}\/\d{4}$/.test(val), "Invalid date format (Expect YYYY-MM-DD or DD/MM/YYYY)"),

    // Time (00, 15, 30, 45) - Using strict regex from spec
    time: z.string().regex(/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/, "Invalid time (must end in 00, 15, 30, 45)"),

    // NOTE: 'end_time' is NOT included here so it gets stripped/ignored.

    // Controlled free text
    additionalInfo: z.string()
        .max(300)
        .regex(/^[a-zA-Z\u00C0-\u00FF0-9@.()\s"'-]*$/, "Special characters not allowed")
        .optional(),

    // Description/Notes (only for editing usually, but if allowed on creation)
    notes: z.string().max(500).optional(),

    // Meet Link (Only for editing usually, but valid to have)
    meetLink: z.string().optional(),

    // Status - Default should be handled by backend if missing
    status: z.string().optional(),

    // Attendant ID - Validated logically in route info
    attendantId: z.string().optional(),

    // Creator ID
    createdBy: z.string().optional()
});

export type CreateAppointmentDTO = z.infer<typeof createAppointmentSchema>;
