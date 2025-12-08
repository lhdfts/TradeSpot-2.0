import type { Attendant, Appointment } from '../types';

// Map JS day index (0-6) to our type's schedule keys
const DAY_MAP: Record<number, string> = {
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
    0: 'sun'
};

const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const getDuration = (type: string): number => {
    if (type === 'Ligação Closer' || type === 'Reschedule') {
        return 45;
    }
    return 30;
};

export const isAttendantWithinSchedule = (
    attendant: Attendant,
    dateStr: string, // YYYY-MM-DD
    timeStr: string  // HH:MM
): boolean => {
    if (!attendant.schedule) return false;

    // Parse date to get day of week
    // Note: "2025-11-28" -> new Date("2025-11-28T00:00:00") to avoid timezone issues
    const date = new Date(`${dateStr}T00:00:00`);
    const dayKey = DAY_MAP[date.getDay()];

    const schedule = attendant.schedule[dayKey];
    if (!schedule) return false;

    const apptMinutes = timeToMinutes(timeStr);
    const startMinutes = timeToMinutes(schedule.start);
    const endMinutes = timeToMinutes(schedule.end);

    // Check work hours
    if (apptMinutes < startMinutes || apptMinutes >= endMinutes) {
        return false;
    }

    // Check pauses
    if (attendant.pauses && attendant.pauses.length > 0) {
        for (const pause of attendant.pauses) {
            const pauseStart = timeToMinutes(pause.start);
            const pauseEnd = timeToMinutes(pause.end);
            if (apptMinutes >= pauseStart && apptMinutes < pauseEnd) {
                return false;
            }
        }
    }

    return true;
};

export const hasConflictingAppointment = (
    attendantId: string,
    dateStr: string,
    timeStr: string,
    newAppointmentType: string,
    allAppointments: Appointment[]
): boolean => {
    const newStart = timeToMinutes(timeStr);
    const newEnd = newStart + getDuration(newAppointmentType);

    return allAppointments.some(appt => {
        // Filter by attendant
        if (appt.attendantId !== attendantId) return false;

        // Filter by date
        if (appt.date !== dateStr) return false;

        // Filter by status (ONLY 'Pendente' blocks time, matching reference)
        if (appt.status !== 'Pendente') return false;

        // Check overlap
        const existingStart = timeToMinutes(appt.time);
        const existingEnd = existingStart + getDuration(appt.type);

        // Conflict if overlap exists
        return newStart < existingEnd && newEnd > existingStart;
    });
};

export const findAvailableCloser = (
    dateStr: string,
    timeStr: string,
    appointmentType: string,
    attendants: Attendant[],
    allAppointments: Appointment[]
): Attendant | null => {
    // 1. Filter Closers
    const closers = attendants.filter(a => a.sector === 'Closer');
    if (closers.length === 0) return null;

    // 2. Filter by Schedule (who is working today?)
    const closersWithSchedule = closers.filter(closer =>
        isAttendantWithinSchedule(closer, dateStr, timeStr)
    );

    if (closersWithSchedule.length === 0) return null;

    // 3. Calculate Load (count pending appointments for this day)
    const closersWithLoad = closersWithSchedule.map(closer => {
        const count = allAppointments.filter(appt =>
            appt.attendantId === closer.id &&
            appt.date === dateStr &&
            appt.status === 'Pendente' && // "Pendente" is the active status
            appt.type !== 'Personal Appointment' // Exclude personal from load count
        ).length;

        return { ...closer, load: count };
    });

    // 4. Sort by Load (asc) then Random
    closersWithLoad.sort((a, b) => {
        if (a.load !== b.load) return a.load - b.load;
        return Math.random() - 0.5;
    });

    // 5. Find first one without conflict
    for (const closer of closersWithLoad) {
        if (!hasConflictingAppointment(closer.id, dateStr, timeStr, appointmentType, allAppointments)) {
            return closer;
        }
    }

    return null;
};
