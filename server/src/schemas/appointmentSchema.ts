import { z } from 'zod';

// Regex for names (Letters, spaces, hyphens, apostrophes)
const nameRegex = /^[a-zA-Z\u00C0-\u00FF\s'.-]+$/;

// Example Enums (Should strictly match database if possible, but hardcoded for now based on system constants)
const VALID_TYPES = ['Ligação SDR', 'Ligação Closer', 'Ligação Equipe Aldeia', 'Agendamento Pessoal', 'Reagendamento Closer', 'Upgrade', 'Fora da agenda', 'Gold Call', 'Onboarding', 'Fechamento'] as const;
const VALID_CURRENCIES = ['BRL', 'USD', 'EUR', 'JPY', 'AOA'] as const;
const VALID_INTEREST_LEVELS = ['Alto', 'Mediano', 'Desconhecido'] as const;
const VALID_KNOWLEDGE_LEVELS = ['Iniciante', 'Intermediário', 'Avançado'] as const;

export const createAppointmentSchema = z.object({
    // Strict number validation (Backend removes mask, but we validate strictly numbers)
    phone: z.coerce.string()
        .regex(/^\d+$/, "O telefone deve conter apenas números")
        .min(8, "O telefone informado é muito curto")
        .max(20, "O telefone informado é muito longo"),

    // Name validation - accept student as specified, or lead for compatibility
    student: z.string()
        .regex(nameRegex, "Nome inválido (verifique espaços duplos)")
        .max(100, "Nome muito longo")
        .optional(),
    lead: z.string()
        .regex(nameRegex, "Nome inválido (verifique espaços duplos)")
        .max(100, "Nome muito longo")
        .optional(),

    // Secure email validation
    email: z.string()
        .email("Email inválido")
        .regex(/^[\w\-\.@]+$/, "Caracteres inválidos no email"),

    // IDs (Validate UUID format or similar)
    eventId: z.string().min(1, "Evento é obrigatório"),

    studentProfile: z.object({
        financial: z.object({
            currency: z.enum(VALID_CURRENCIES, {
                message: 'Selecione uma moeda válida'
            }).optional(),
            amount: z.union([z.string(), z.number()]).optional().refine((val) => {
                if (val == null) return true;
                if (typeof val === 'number') return val <= 1000000;
                if (!val) return true;
                const clean = val.replace(/\./g, '').replace(',', '.');
                const num = parseFloat(clean);
                return !isNaN(num) && num <= 1000000;
            }, { message: "O valor máximo permitido é 1.000.000,00" })
        }).optional(),
        interest: z.enum(VALID_INTEREST_LEVELS, {
            message: 'Nível de interesse inválido'
        }).optional(),
        knowledge: z.enum(VALID_KNOWLEDGE_LEVELS, {
            message: 'Nível de conhecimento inválido'
        }).optional()
    }).optional(),

    type: z.enum(VALID_TYPES, {
        message: 'Tipo de agendamento inválido'
    }),

    // Date DD/MM/YYYY
    // We refine to ensure strict format.
    date: z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val) || /^\d{2}\/\d{2}\/\d{4}$/.test(val), "Formato de data inválido (Use YYYY-MM-DD ou DD/MM/YYYY)"),

    // Time (00, 15, 30, 45) - Using strict regex from spec
    time: z.string().regex(/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/, "Horário inválido (minutos devem ser 00, 15, 30, 45)"),

    // NOTE: 'end_time' is NOT included here so it gets stripped/ignored.

    // Controlled free text - accept additional_info as specified, or additionalInfo for compatibility
    additional_info: z.string()
        .max(500, "Máximo de 500 caracteres")
        .regex(/^[a-zA-Z\u00C0-\u00FF0-9@.()\s"'\-,:;!?]*$/, "Caracteres especiais não permitidos")
        .optional(),
    additionalInfo: z.string()
        .max(500, "Máximo de 500 caracteres")
        .regex(/^[a-zA-Z\u00C0-\u00FF0-9@.()\s"'\-,:;!?]*$/, "Caracteres especiais não permitidos")
        .optional(),

    // Description/Notes (only for editing usually, but if allowed on creation)
    notes: z.string().max(500, "Máximo de 500 caracteres").optional(),

    // Meet Link (Only for editing usually, but valid to have)
    meetLink: z.string().optional(),

    // Status - Default should be handled by backend if missing
    status: z.string().optional(),

    // Attendant ID - Validated logically in route info
    attendantId: z.string().optional(),

    // Creator ID
    createdBy: z.string().optional()
}).refine(data => data.student || data.lead, {
    message: "O nome do aluno (student ou lead) deve ser fornecido",
    path: ["student"]
});

export type CreateAppointmentDTO = z.infer<typeof createAppointmentSchema>;

export const publicAppointmentSchema = z.object({
    // Strict number validation
    phone: z.coerce.string().trim()
        .regex(/^\d+$/, "O telefone deve conter apenas números")
        .min(8, "O telefone informado é muito curto") // Allow min 8 for international numbers
        .max(20, "O telefone informado é muito longo"),

    // Name validation
    lead: z.string().trim()
        .regex(nameRegex, "Nome contém caracteres inválidos")
        .max(100, "Nome muito longo")
        .min(2, "Nome muito curto"),

    // Secure email validation
    email: z.string().trim()
        .email("Email inválido")
        .regex(/^[\w\-\.\+@]+$/, "Caracteres inválidos no email"),

    // Date DD/MM/YYYY or YYYY-MM-DD
    date: z.string().trim().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val) || /^\d{2}\/\d{2}\/\d{4}$/.test(val), "Formato de data inválido"),

    // Time (00, 15, 30, 45)
    time: z.string().trim().regex(/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/, "Horário inválido"),

    attendantId: z.string().optional(),

    // Type is optional in input but will be forced to 'Ligação Closer'
    type: z.string().optional(),
});
