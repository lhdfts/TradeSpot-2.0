
import { api } from './api';

async function main() {
    console.log("Testing Supabase Appointments List...");
    try {
        const result = await api.appointments.list();
        console.log("Success! Count:", result.length);
        if (result.length > 0) {
            console.log("Sample:", result[0]);
        } else {
            console.log("Result is empty.");
        }
    } catch (error) {
        console.error("Error fetching appointments:", error);
    }
}

main();
