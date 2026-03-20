
import { supabase } from '../lib/supabase';

async function main() {
    console.log("Fetching one appointment to inspect columns...");
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Raw object keys:", Object.keys(data));
        console.log("Old Status Value:", data['oldStatus'] || data['old_status'] || 'Not Found');
        console.log("Updated By Value:", data['updatedBy'] || data['updated_by'] || 'Not Found');
    }
}

main();
