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

export type SearchPersonsDTO = z.infer<typeof SearchPersonsSchema>;
export type SearchDealsDTO = z.infer<typeof SearchDealsSchema>;
