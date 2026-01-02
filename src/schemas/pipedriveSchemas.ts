import { z } from 'zod';

export const SearchPersonsSchema = z.object({
    term: z.string().min(1, "Term is required"),
    fields: z.string().optional(),
    exact_match: z.boolean().optional(),
    limit: z.number().int().min(1).max(500).optional(),
    start: z.number().int().min(0).optional()
});

export const SearchDealsSchema = z.object({
    term: z.string().optional(),
    person_id: z.number().int().positive().optional(),
    fields: z.string().optional(),
    exact_match: z.boolean().optional(),
    status: z.enum(['open', 'won', 'lost', 'deleted', 'all_not_deleted']).optional(),
    limit: z.number().int().min(1).max(500).optional(),
    start: z.number().int().min(0).optional()
}).refine(data => data.term || data.person_id, {
    message: "Either 'term' or 'person_id' must be provided",
    path: ["term"]
});

export type SearchPersonsDTO = z.infer<typeof SearchPersonsSchema>;
export type SearchDealsDTO = z.infer<typeof SearchDealsSchema>;
