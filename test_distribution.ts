import { findAvailableCloserWithLogs } from './src/utils/distribution';
import { getAttendants, getAppointments, getEvents } from './src/services/api';

async function run() {
    try {
        const attendants = await getAttendants();
        const appointments = await getAppointments();
        const events = await getEvents();
        
        const dateStr = "26/08/2026"; // from screenshot
        const timeStr = "14:00"; // pick a time
        const appointmentType = "Fechamento"; // from screenshot
        
        console.log(`Total attendants: ${attendants.length}`);
        
        const result = findAvailableCloserWithLogs(dateStr, timeStr, appointmentType, attendants, appointments, { durationMinutes: 60 });
        
        console.log(`\nResult for ${timeStr}:`, result.attendant ? result.attendant.name : 'null');
        console.log(`Logs:`);
        result.checksLog.forEach((log: any) => console.log(`- ${log.name}: ${log.reason}`));
        
    } catch (e) {
        console.error(e);
    }
}
run();
