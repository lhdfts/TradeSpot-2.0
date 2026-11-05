import { z } from 'zod';

export const SearchPersonsSchema = z.object({
    term: z.string().min(1, "Term is required"),
    fields: z.string().optional(),
    exact_match: z.string().transform(val => val === 'true').or(z.boolean()).optional(), // Handle query string "true"
    limit: z.string().transform(Number).or(z.number()).pipe(z.number().int().min(1).max(500)).optional(), // Handle query string "10"
    start: z.string().transform(Number).or(z.number()).pipe(z.number().int().min(0)).optional()
});

export const SearchDealsSchema = z.object({
    term: z.string().optional(),
    person_id: z.string().transform(Number).or(z.number()).pipe(z.number().int().positive()).optional(),
    fields: z.string().optional(),
    exact_match: z.string().transform(val => val === 'true').or(z.boolean()).optional(),
    status: z.enum(['open', 'won', 'lost', 'deleted', 'all_not_deleted']).optional(),
    limit: z.string().transform(Number).or(z.number()).pipe(z.number().int().min(1).max(500)).optional(),
    start: z.string().transform(Number).or(z.number()).pipe(z.number().int().min(0)).optional()
}).refine(data => data.term || data.person_id, {
    message: "Either 'term' or 'person_id' must be provided",
    path: ["term"]
});

// Query de GET /persons/:id/deals (o :id é validado na rota)
export const PersonDealsQuerySchema = z.object({
    status: z.enum(['open', 'won', 'lost', 'deleted', 'all_not_deleted'], { message: 'Status inválido' }).optional(),
    limit: z.string().regex(/^\d+$/, 'Limite inválido').transform(Number).pipe(z.number().int().min(1).max(500)).optional(),
    start: z.string().regex(/^\d+$/, 'Início inválido').transform(Number).pipe(z.number().int().min(0)).optional()
});

export type SearchPersonsDTO = z.infer<typeof SearchPersonsSchema>;
export type SearchDealsDTO = z.infer<typeof SearchDealsSchema>;
