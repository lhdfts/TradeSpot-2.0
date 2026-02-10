import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Load .env from project root (3 levels up from dist/config)
// server/dist/config -> server/dist -> server -> root
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Also try server root just in case (2 levels up)
dotenv.config({ path: path.join(__dirname, '../../.env') });
