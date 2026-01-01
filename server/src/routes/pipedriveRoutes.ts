import { Router, Request, Response } from 'express';
import axios from 'axios';
import { SearchPersonsSchema, SearchDealsSchema } from '../schemas/pipedriveSchemas';

const router = Router();

// Helper to get config
const getSettings = () => {
    // Try standard env vars first, then VITE_ prefixed as fallback if sharing .env
    const token = process.env.PIPEDRIVE_API_TOKEN || process.env.VITE_PIPEDRIVE_API_TOKEN;
    const url = process.env.PIPEDRIVE_API_URL || process.env.VITE_PIPEDRIVE_API_URL || 'https://api.pipedrive.com/v1';

    if (!token) {
        throw new Error('Pipedrive API Token not configured');
    }

    return { token, url };
};

// Search Persons Proxy
router.get('/persons/search', async (req: Request, res: Response) => {
    try {
        // Validate Query Params
        const validation = SearchPersonsSchema.safeParse(req.query);

        if (!validation.success) {
            res.status(400).json({
                error: 'Validation Error',
                details: validation.error.format()
            });
            return;
        }

        const { term, limit, start, exact_match } = validation.data;
        const { token, url } = getSettings();

        const response = await axios.get(`${url}/persons/search`, {
            params: {
                api_token: token,
                term,
                limit: limit || 10,
                start: start || 0,
                exact_match: exact_match
            }
        });

        res.json(response.data);
    } catch (error: any) {
        console.error('Pipedrive Search Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch from Pipedrive',
            details: error.response?.data || error.message
        });
    }
});

// Search/List Deals Proxy
router.get('/deals', async (req: Request, res: Response) => {
    return handleDeals(req, res);
});

// Alias for search to avoid breaking existing clients strictly
router.get('/deals/search', async (req: Request, res: Response) => {
    return handleDeals(req, res);
});

async function handleDeals(req: Request, res: Response) {
    try {
        const validation = SearchDealsSchema.safeParse(req.query);

        if (!validation.success) {
            res.status(400).json({
                error: 'Validation Error',
                details: validation.error.format()
            });
            return;
        }

        const { term, person_id, status, limit, start, exact_match } = validation.data;
        const { token, url } = getSettings();

        let apiUrl = `${url}/deals/search`;
        const params: any = {
            api_token: token,
            limit: limit || 10,
            start: start || 0
        };

        if (person_id) {
            apiUrl = `${url}/deals`;
            params.person_id = person_id;
            params.status = status || 'open';
        } else {
            params.term = term;
            params.exact_match = exact_match;
        }

        const response = await axios.get(apiUrl, { params });
        res.json(response.data);

    } catch (error: any) {
        console.error('Pipedrive Deals Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to search/list deals from Pipedrive',
            details: error.response?.data || error.message
        });
    }
}

export default router;
