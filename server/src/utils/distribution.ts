
import { createClient } from '@supabase/supabase-js';

// Types (simplified for backend)
interface Attendant {
    id: string;
    name: string;
    sector: string;
    schedule: any;
    pauses: any;
    denied_events?: string[]; // Array of event IDs (UUIDs)
}
interface Appointment {
    id: string;
    attendant_id: string;
    date: string;
    time: string;
    end_time?: string;
    type: string;
    status: string;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

// Event-specific blocklist: prevent specific closer(s) from receiving appointments
// for a given event, even if they have schedule availability.
// MOVED TO DYNAMIC CHECK via user.denied_events

export const isAttendantBlockedForEvent = (
    attendant: Attendant | null | undefined,
    eventId?: string | null,
    appointmentType?: string
): boolean => {
    if (!attendant || !eventId) return false;

    // Exception: 'Upgrade' type is NEVER blocked, even if event is in denied_events
    if (appointmentType === 'Upgrade') return false;

    const deniedEvents = attendant.denied_events;
    if (!deniedEvents || !Array.isArray(deniedEvents)) return false;

    return deniedEvents.includes(eventId);
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
    if (prevSchedule && prevSchedule.start && prevSchedule.end) {
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
    if (!schedule || !schedule.start || !schedule.end) return false;

    const startMinutes = timeToMinutes(schedule.start);
    let endMinutes = timeToMinutes(schedule.end);

    // Apply logic: treat as "crossed midnight" if end <= start
    if (endMinutes <= startMinutes && endMinutes !== 0) {
        endMinutes += 1440;
    } else if (endMinutes === 0) {
        endMinutes = 1440;
    }

    // Normal or Overnight Shift (now unified range)
    if (apptStart < startMinutes || apptEnd > endMinutes) return false;

    if (attendant.pauses && attendant.pauses[dayKey]) {
        for (const pause of attendant.pauses[dayKey]) {
            const pauseStart = timeToMinutes(pause.start);
            let pauseEnd = timeToMinutes(pause.end);

            // Apply same midnight logic for pauses
            if (pauseEnd <= pauseStart && pauseEnd !== 0) {
                pauseEnd += 1440;
            } else if (pauseEnd === 0) {
                pauseEnd = 1440;
            }

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
        
        // Use end_time from DB if available, otherwise calculate it
        let existingEnd: number;
        if (appt.end_time) {
            existingEnd = timeToMinutes(appt.end_time);
            // APPLY USER LOGIC: if end_time <= start_time, it crossed midnight
            if (existingEnd <= existingStart && existingEnd !== 0) {
                existingEnd += 1440;
            } else if (existingEnd === 0 && existingStart > 0) {
                existingEnd = 1440;
            }
        } else {
            existingEnd = existingStart + getDuration(appt.type);
        }

        // Conflict if ranges overlap
        return newStart < existingEnd && newEnd > existingStart;
    });
};

export const hasSectorTimeLimit = (
    sector: string,
    dateStr: string,
    timeStr: string,
    newAppointmentType: string,
    allAppointments: any[],
    attendants: any[],
    excludeAppointmentId?: string
): boolean => {
    if (sector !== 'Aldeia' && sector !== 'Tribo') return false;
    if (newAppointmentType === 'Agendamento Pessoal' || newAppointmentType === 'Personal Appointment') return false;

    const sectorAttendants = new Set(attendants.filter(a => a.sector === sector).map(a => a.id));
    
    const newStart = timeToMinutes(timeStr);
    const newEnd = newStart + getDuration(newAppointmentType);

    let concurrentCount = 0;

    for (const appt of allAppointments) {
        if (excludeAppointmentId && appt.id === excludeAppointmentId) continue;
        if (appt.status !== 'Pendente') continue;
        if (appt.type === 'Agendamento Pessoal' || appt.type === 'Personal Appointment') continue;
        if (appt.date !== dateStr) continue;
        
        // Handle both frontend (attendantId) and backend (attendant_id) keys
        const attId = appt.attendant_id || appt.attendantId;
        if (!sectorAttendants.has(attId)) continue;

        const existingStart = timeToMinutes(appt.time);
        let existingEnd: number;
        if (appt.end_time) {
            existingEnd = timeToMinutes(appt.end_time);
            if (existingEnd <= existingStart && existingEnd !== 0) existingEnd += 1440;
            else if (existingEnd === 0 && existingStart > 0) existingEnd = 1440;
        } else {
            existingEnd = existingStart + getDuration(appt.type);
        }

        if (newStart < existingEnd && newEnd > existingStart) {
            concurrentCount++;
        }
    }

    return concurrentCount >= 2;
};

export const findBestAttendant = async (
    date: string,
    time: string,
    type: string,
    eventId?: string,
    options: { ignoreSchedule?: boolean } = {}
): Promise<string | null> => {
    let sectors = ['Closer'];
    let roleFilter: string | null = null;
    let sectorLimitCheck: string | null = null;

    const isCloserType = ['Ligação Closer', 'Gold Call', 'Reagendamento Closer', 'Upgrade'].includes(type);

    if (eventId && !isCloserType) {
        const { data: eventData } = await supabase.from('events').select('sector').eq('id', eventId).single();
        if (eventData) {
            if (eventData.sector === 'Perpétuos') {
                sectors = ['Perpétuos'];
            } else if (eventData.sector === 'CEO') {
                sectors = ['CEO'];
            } else if (eventData.sector === 'Tribo') {
                sectors = ['Tribo'];
                roleFilter = 'Colaborador';
                sectorLimitCheck = 'Tribo';
            } else if (eventData.sector === 'Aldeia') {
                sectors = ['Aldeia'];
                roleFilter = 'Colaborador';
                sectorLimitCheck = 'Aldeia';
            } else if (eventData.sector === 'SDR') {
                sectors = ['SDR'];
                roleFilter = 'Colaborador';
            } else {
                sectors = [eventData.sector];
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
    const attendantsForEvent = attendants.filter(a => !isAttendantBlockedForEvent(a, eventId, type));

    // 2. Fetch Appointments for this day to check load/conflicts
    const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select('id, attendant_id, date, time, end_time, type, status')
        .eq('date', date)
        .neq('status', 'Cancelado'); // Ignore cancelled

    if (appError || !appointments) {
        console.error("Error fetching appointments:", appError);
        return null;
    }

    // 3. Filter by Schedule
    let available = attendantsForEvent;
    if (!options.ignoreSchedule) {
        available = attendantsForEvent.filter(a => isAttendantWithinSchedule(a, date, time, type));
    }
    if (available.length === 0) return null;

    // Sector limits check
    if (sectorLimitCheck) {
        if (hasSectorTimeLimit(sectorLimitCheck, date, time, type, appointments, attendants)) {
            return null;
        }
    }

    // 4. Calculate Load
    const withLoad = available.map(a => {
        const load = appointments.filter(appt =>
            appt.attendant_id === a.id &&
            appt.status === 'Pendente' &&
            !['Agendamento Pessoal', 'Personal Appointment'].includes(appt.type)
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
