
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

// Event-specific blocklist: prevent specific closer(s) from receiving appointments
// for a given event, even if they have schedule availability.
const BLOCKED_ATTENDANTS_BY_EVENT: Record<string, string[]> = {
    // event_id: df5f53c4-d659-4fa5-b779-627f6ec4f064
    // closer user_id: 5b2553e4-6c1a-434d-909d-ae479f74faee
    'df5f53c4-d659-4fa5-b779-627f6ec4f064': ['5b2553e4-6c1a-434d-909d-ae479f74faee']
};

export const isAttendantBlockedForEvent = (attendantId?: string | null, eventId?: string | null): boolean => {
    if (!attendantId || !eventId) return false;
    const blockedIds = BLOCKED_ATTENDANTS_BY_EVENT[eventId];
    if (!blockedIds || blockedIds.length === 0) return false;
    return blockedIds.includes(attendantId);
};

const DAY_MAP: Record<number, string> = {
    1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun'
};

export const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

export const getDuration = (type: string): number => {
    if (type === 'Ligação SDR') return 30;
    return 60; // Todos os outros (Closer, Upgrade, Pessoal, etc) duram 1 hora
};

// Check if attendant is working at this time
export const isAttendantWithinSchedule = (
    attendant: Attendant,
    dateStr: string,
    timeStr: string,
    appointmentType: string
): boolean => {
    if (!attendant.schedule) return false;

    if (attendant.sector === 'CEO') {
        const customDates = attendant.schedule.custom_dates || {};
        const timesForDate = customDates[dateStr];
        // For CEO, they are only available if the exact time is listed in their custom_dates for that day
        return Array.isArray(timesForDate) && timesForDate.includes(timeStr);
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayKey = DAY_MAP[date.getDay()];

    // Check Previous Day for Overnight Spillover
    const prevDate = new Date(date);
    prevDate.setDate(date.getDate() - 1);
    const prevDayKey = DAY_MAP[prevDate.getDay()];

    const schedule = attendant.schedule?.[dayKey];
    const prevSchedule = attendant.schedule?.[prevDayKey];

    const apptStart = timeToMinutes(timeStr);
    const duration = getDuration(appointmentType);
    const apptEnd = apptStart + duration;

    // 1. Check Previous Day Spillover
    if (prevSchedule) {
        const prevStart = timeToMinutes(prevSchedule.start);
        let prevEnd = timeToMinutes(prevSchedule.end);
        if (prevEnd === 0) prevEnd = 1440; // Treat 00:00 as 24:00

        // If overnight shift yesterday (e.g. 22:00 - 02:00)
        // Valid for today if time < prevEnd (e.g. 01:00 < 02:00)
        if (prevStart >= prevEnd) { // Overnight shift condition
            if (apptStart < prevEnd) {
                // Check pauses if needed (omitted for overnight spillover simplicity or add later)
                return true;
            }
        }
    }

    // 2. Check Current Day
    if (!schedule) return false;

    const startMinutes = timeToMinutes(schedule.start);
    let endMinutes = timeToMinutes(schedule.end);
    if (endMinutes === 0) endMinutes = 1440;

    // Normal Shift
    if (startMinutes < endMinutes) {
        if (apptStart < startMinutes || apptEnd > endMinutes) return false;
    }
    // Overnight Shift (starts today, ends tomorrow)
    else {
        // Valid if starts after shift start (e.g. 23:00 >= 22:00)
        // Ends can go into next day, so we just check start time boundary for today
        if (apptStart < startMinutes) return false;
    }

    if (attendant.pauses && attendant.pauses[dayKey]) {
        for (const pause of attendant.pauses[dayKey]) {
            const pauseStart = timeToMinutes(pause.start);
            const pauseEnd = timeToMinutes(pause.end);

            // Check for overlap: (StartA < EndB) and (EndA > StartB)
            if (apptStart < pauseEnd && apptEnd > pauseStart) return false;
        }
    }
    return true;
};

// Check for overlapping appointments
export const hasConflictingAppointment = (
    attendantId: string,
    dateStr: string,
    timeStr: string,
    newType: string,
    appointments: Appointment[],
    excludeId?: string
): boolean => {
    const newStart = timeToMinutes(timeStr);
    const newEnd = newStart + getDuration(newType);

    return appointments.some(appt => {
        if (appt.attendant_id !== attendantId) return false;
        if (appt.status !== 'Pendente') return false; // Only Pendente blocks
        if (excludeId && appt.id === excludeId) return false; // Exclude self if updating

        const existingStart = timeToMinutes(appt.time);
        const existingEnd = existingStart + getDuration(appt.type);
        return newStart < existingEnd && newEnd > existingStart;
    });
};

export const findBestAttendant = async (
    date: string,
    time: string,
    type: string,
    eventId?: string
): Promise<string | null> => {
    let sectors = ['Closer', 'Líder', 'Co-Líder'];
    let roleFilter: string | null = null;

    if (eventId) {
        const { data: eventData } = await supabase.from('events').select('sector').eq('id', eventId).single();
        if (eventData) {
            if (eventData.sector === 'Perpétuos') {
                sectors = ['Perpétuos'];
            } else if (eventData.sector === 'CEO') {
                sectors = ['CEO'];
            } else if (eventData.sector === 'Tribo') {
                sectors = ['Tribo'];
                roleFilter = 'Colaborador';
            } else if (eventData.sector === 'Aldeia') {
                sectors = ['Aldeia'];
                roleFilter = 'Colaborador';
            }
        }
    }

    // 1. Fetch Attendants filtered by sector (and role if needed)
    let attendantsQuery = supabase.from('user').select('*').in('sector', sectors);
    if (roleFilter) {
        attendantsQuery = attendantsQuery.eq('role', roleFilter);
    }
    const { data: attendants, error: attError } = await attendantsQuery;

    if (attError || !attendants) {
        console.error("Error fetching attendants:", attError);
        return null;
    }

    // 2.5. Apply event-specific blocklist to prevent assigning blocked closers
    const blockedIds = eventId ? (BLOCKED_ATTENDANTS_BY_EVENT[eventId] ?? []) : [];
    const attendantsForEvent = blockedIds.length > 0
        ? attendants.filter(a => !blockedIds.includes(a.id))
        : attendants;

    // 2. Fetch Appointments for this day to check load/conflicts
    const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select('id, attendant_id, date, time, type, status')
        .eq('date', date)
        .eq('status', 'Pendente');

    if (appError || !appointments) {
        console.error("Error fetching appointments:", appError);
        return null;
    }

    // 3. Filter by Schedule
    const available = attendantsForEvent.filter(a => isAttendantWithinSchedule(a, date, time, type));
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
