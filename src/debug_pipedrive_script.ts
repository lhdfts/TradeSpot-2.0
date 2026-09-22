
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
process.env.VITE_PIPEDRIVE_API_URL = 'https://api.pipedrive.com/v1';

async function run() {
    try {
        const { searchDeals, findPersonByEmail } = await import('./services/pipedriveService');
        const email = 'ovencedordebatalhas@hotmail.com';
        const person = await findPersonByEmail(email);

        if (!person) {
            fs.writeFileSync('result.json', JSON.stringify({ error: 'Person not found' }));
            return;
        }

        const dealsData = await searchDeals({ person_id: person.id, status: 'all_not_deleted', limit: 50 });
        const deals = dealsData.data || [];

        const output = deals.map((d: any) => ({
            id: d.id,
            title: d.title,
            pipeline_id: d.pipeline_id,
            stage_id: d.stage_id,
            status: d.status,
            add_time: d.add_time
        }));

        fs.writeFileSync('result.json', JSON.stringify(output, null, 2));

    } catch (error: any) {
        fs.writeFileSync('result.json', JSON.stringify({ error: error.message }));
    }
}

run();
