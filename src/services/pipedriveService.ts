import axios from 'axios';
import { SearchPersonsSchema, SearchDealsSchema } from '../schemas/pipedriveSchemas';

// Declare process to avoid TypeScript errors in frontend environment (since this file is shared with Node scripts)
declare const process: any;

// --- Configuração de Ambiente (Node vs Vite) ---

// 1. Define o TOKEN (Necessário para modo direto/testes. No frontend/proxy, pode ser vazio se o backend injetar)
const rawToken = (typeof process !== 'undefined' && process.env.VITE_PIPEDRIVE_API_TOKEN) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PIPEDRIVE_API_TOKEN) ||
    '';

// 2. Define a URL para apontar para o seu backend local
// Fallback robusto para suportar tanto Vite (browser) quanto Node/tsx (testes)
const rawUrl = (typeof process !== 'undefined' && process.env.VITE_PIPEDRIVE_API_URL) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PIPEDRIVE_API_URL) ||
    'http://localhost:3000/api/pipedrive';

// 3. Cria o objeto settings centralizado
const settings = {
    PIPEDRIVE_API_TOKEN: rawToken,
    PIPEDRIVE_API_URL: rawUrl
};

// --- Interfaces ---

interface SearchParams {
    api_token?: string; // Agora opcional, pois o backend insere
    term?: string;
    fields?: string;
    exact_match?: string;
    limit?: number;
    start?: number;
    person_id?: number;
    status?: string;
}

export interface SearchDealsOptions {
    term?: string;
    person_id?: number;
    fields?: string;
    exact_match?: boolean;
    limit?: number;
    start?: number;
}

// --- Helper Functions ---

const getHeaders = (): Record<string, string> => {
    return {
        "Content-Type": "application/json"
    };
};

const getParams = (): SearchParams => {
    const params: SearchParams = {};
    if (settings.PIPEDRIVE_API_TOKEN) {
        params.api_token = settings.PIPEDRIVE_API_TOKEN;
    }
    return params;
};

// --- Main Functions ---

/**
 * Search for persons in Pipedrive.
 */

/**
 * Search for persons in Pipedrive.
 */
export const searchPersons = async (
    term: string,
    fields?: string,
    exact_match: boolean = false,
    limit: number = 10,
    start: number = 0
): Promise<any> => {
    // 1. Zod Validation (Frontend Side)
    const input = { term, fields, exact_match, limit, start };
    const validation = SearchPersonsSchema.safeParse(input);

    if (!validation.success) {
        console.error("Validation Error (Frontend):", validation.error.format());
        throw new Error(`Invalid Input: ${validation.error.issues.map((e: any) => e.message).join(', ')}`);
    }

    const url = `${settings.PIPEDRIVE_API_URL}/persons/search`;

    const params: SearchParams = {
        ...getParams(),
        term,
        limit,
        start,
        exact_match: String(exact_match).toLowerCase()
    };

    if (fields) {
        params.fields = fields;
    }

    try {
        const response = await axios.get(url, {
            headers: getHeaders(),
            params: params,
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(`Pipedrive API Error (searchPersons): ${error.response?.data?.error || error.message}`);
            // Log útil para debug caso a URL esteja errada
            console.error(`Attempted URL: ${url}`);
        }
        throw error;
    }
};

/**
 * Search for deals in Pipedrive.
 */
// ... continuation of searchDeals ...
export const searchDeals = async ({
    term,
    person_id,
    fields,
    exact_match = false,
    limit = 10,
    start = 0
}: SearchDealsOptions): Promise<any> => {

    // 1. Zod Validation
    const input = { term, person_id, fields, exact_match, limit, start };
    const validation = SearchDealsSchema.safeParse(input);

    if (!validation.success) {
        console.error("Validation Error (Frontend):", validation.error.format());
        throw new Error(`Invalid Input: ${validation.error.issues.map((e: any) => e.message).join(', ')}`);
    }

    const params: SearchParams = {
        ...getParams(),
        limit
    };

    let url: string;

    if (person_id) {
        // List deals for a specific person
        url = `${settings.PIPEDRIVE_API_URL}/deals`;
        params.person_id = person_id;
        params.status = "open";
    } else {

        if (!term) {
            throw new Error("Term is required when not filtering by person_id");
        }

        url = `${settings.PIPEDRIVE_API_URL}/deals/search`;
        params.term = term;
        params.start = start;
        params.exact_match = String(exact_match).toLowerCase();

        if (fields) {
            params.fields = fields;
        }
    }

    try {
        const response = await axios.get(url, {
            headers: getHeaders(),
            params: params,
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(`Pipedrive API Error (searchDeals): ${error.response?.data?.error || error.message}`);
        }
        throw error;
    }
};