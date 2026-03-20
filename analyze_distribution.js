
const fs = require('fs');
const path = require('path');

// Use absolute paths or process.cwd()
const cwd = process.cwd();
const closersPath = path.join(cwd, 'user.closers');
const appointmentsPath = path.join(cwd, 'appointments.json');

console.log('Current CWD:', cwd);
console.log('Reading closers from:', closersPath);
console.log('Reading appointments from:', appointmentsPath);

try {
    if (!fs.existsSync(closersPath)) {
        throw new Error(`File not found: ${closersPath}`);
    }
    if (!fs.existsSync(appointmentsPath)) {
        throw new Error(`File not found: ${appointmentsPath}`);
    }

    const closersData = fs.readFileSync(closersPath, 'utf8');
    const appointmentsData = fs.readFileSync(appointmentsPath, 'utf8');

    const closers = JSON.parse(closersData);
    const appointments = JSON.parse(appointmentsData);

    const closerMap = {};
    closers.forEach(c => {
        closerMap[c.id] = { name: c.name, count: 0, recentCount: 0 };
    });

    console.log(`Loaded ${closers.length} closers.`);
    console.log(`Loaded ${appointments.length} appointments.`);

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    let totalCloserAppointments = 0;
    let totalRecentCloserAppointments = 0;

    appointments.forEach(appt => {
        // Clean up ID if necessary (sometimes whitespace?)
        const attId = appt.attendant_id ? appt.attendant_id.trim() : null;

        if (attId && closerMap[attId]) {
            closerMap[attId].count++;
            totalCloserAppointments++;

            const apptDate = new Date(appt.created_at || appt.date);
            if (apptDate >= sevenDaysAgo) {
                closerMap[attId].recentCount++;
                totalRecentCloserAppointments++;
            }
        }
    });

    console.log('\n--- Distribution Summary (All Time) ---');
    Object.values(closerMap).sort((a, b) => b.count - a.count).forEach(c => {
        const percentage = totalCloserAppointments > 0 ? ((c.count / totalCloserAppointments) * 100).toFixed(2) : 0;
        console.log(`${c.name}: ${c.count} (${percentage}%)`);
    });

    console.log('\n--- Distribution Summary (Last 7 Days) ---');
    Object.values(closerMap).sort((a, b) => b.recentCount - a.recentCount).forEach(c => {
        const percentage = totalRecentCloserAppointments > 0 ? ((c.recentCount / totalRecentCloserAppointments) * 100).toFixed(2) : 0;
        console.log(`${c.name}: ${c.recentCount} (${percentage}%)`);
    });

} catch (err) {
    console.error('Error:', err.message);
}
