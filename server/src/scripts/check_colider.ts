import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users, error } = await supabase
    .from('user')
    .select('id, name, sector, role')
    .eq('id', 'a6127506-db64-4ac9-ba09-7eac663b0b31');

  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Users with sector Aldeia and role Co-líder:');
    console.log(JSON.stringify(users, null, 2));
  }
}

run().catch(console.error);
