
import { createClient } from '@supabase/supabase-js';

// Types (simplified for backend)
interface Attendant {
    id: string;
    name: string;
    sector: string;
    schedule: any;
    pauses: any;
}
interface Appointment {
    id: string;
    attendant_id: string;
    date: string;
    time: string;
    type: string;
    status: string;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const DAY_MAP: Record<number, string> = {
    1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun'
};

const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const getDuration = (type: string): number => {
    if (['Ligação Closer', 'Reschedule', 'Reagendamento Closer'].includes(type)) return 45;
    return 30;
};

// Check if attendant is working at this time
const isAttendantWithinSchedule = (attendant: Attendant, dateStr: string, timeStr: string): boolean => {
    if (!attendant.schedule) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayKey = DAY_MAP[date.getDay()];
    const schedule = attendant.schedule?.[dayKey];

    if (!schedule) return false;

    const apptMinutes = timeToMinutes(timeStr);
    const startMinutes = timeToMinutes(schedule.start);
    const endMinutes = timeToMinutes(schedule.end);

    if (apptMinutes < startMinutes || apptMinutes >= endMinutes) return false;

    if (attendant.pauses && attendant.pauses[dayKey]) {
        for (const pause of attendant.pauses[dayKey]) {
            const pauseStart = timeToMinutes(pause.start);
            const pauseEnd = timeToMinutes(pause.end);
            if (apptMinutes >= pauseStart && apptMinutes < pauseEnd) return false;
        }
    }
    return true;
};

// Check for overlapping appointments
const hasConflictingAppointment = (
    attendantId: string,
    dateStr: string,
    timeStr: string,
    newType: string,
    appointments: Appointment[]
): boolean => {
    const newStart = timeToMinutes(timeStr);
    const newEnd = newStart + getDuration(newType);

    return appointments.some(appt => {
        if (appt.attendant_id !== attendantId) return false;
        if (appt.status !== 'Pendente') return false; // Only Pendente blocks

        const existingStart = timeToMinutes(appt.time);
        const existingEnd = existingStart + getDuration(appt.type);
        return newStart < existingEnd && newEnd > existingStart;
    });
};

export const findBestAttendant = async (
    date: string,
    time: string,
    type: string
): Promise<string | null> => {
    // 1. Fetch Closers
    // Note: Assuming 'user' table holds attendants.
    const { data: attendants, error: attError } = await supabase
        .from('user')
        .select('*')
        .in('sector', ['Closer', 'Líder', 'Co-Líder']); // Correct sector logic

    if (attError || !attendants) {
        console.error("Error fetching attendants:", attError);
        return null;
    }

    // 2. Fetch Appointments for this day to check load/conflicts
    const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select('id, attendant_id, date, time, type, status')
        .eq('date', date)
        .neq('status', 'Cancelado'); // Ignore cancelled

    if (appError || !appointments) {
        console.error("Error fetching appointments:", appError);
        return null;
    }

    // 3. Filter by Schedule
    const available = attendants.filter(a => isAttendantWithinSchedule(a, date, time));
    if (available.length === 0) return null;

    // 4. Calculate Load
    const withLoad = available.map(a => {
        const load = appointments.filter(appt =>
            appt.attendant_id === a.id &&
            appt.status === 'Pendente' &&
            appt.type !== 'Personal Appointment'
        ).length;
        return { ...a, load };
    });

    // 5. Sort by Load
    withLoad.sort((a, b) => {
        if (a.load !== b.load) return a.load - b.load;
        return Math.random() - 0.5;
    });

    // 6. Check Conflicts
    for (const attendant of withLoad) {
        if (!hasConflictingAppointment(attendant.id, date, time, type, appointments)) {
            return attendant.id;
        }
    }

    return null;
};
