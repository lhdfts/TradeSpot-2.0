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
    if (['Ligação Closer', 'Gold Call', 'Reschedule', 'Reagendamento Closer', 'Upgrade', 'Agendamento Pessoal'].includes(type)) {
        return 60;
    }
    return 30;
};

export const generateAllTimes = () => {
    const times: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute of [0, 15, 30, 45]) {
            const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            times.push(timeStr);
        }
    }
    return times;
};

export const isAttendantWithinSchedule = (
    attendant: Attendant,
    dateStr: string, // YYYY-MM-DD
    timeStr: string,  // HH:MM
    appointmentType: string // Added type to calculate duration
): boolean => {
    if (!attendant.schedule) return false;

    // Parse date to get day of week safely
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayKey = DAY_MAP[date.getDay()];

    // Check Previous Day for Overnight Spillover
    const prevDate = new Date(date);
    prevDate.setDate(date.getDate() - 1);
    const prevDayKey = DAY_MAP[prevDate.getDay()];

    const apptStart = timeToMinutes(timeStr);
    const duration = getDuration(appointmentType);
    const apptEnd = apptStart + duration;

    // 1. Check Previous Day Spillover
    const prevSchedule = attendant.schedule?.[prevDayKey];
    if (prevSchedule) {
        const prevStart = timeToMinutes(prevSchedule.start);
        let prevEnd = timeToMinutes(prevSchedule.end);
        if (prevEnd === 0) prevEnd = 1440; // Treat 00:00 as 24:00

        // If overnight shift yesterday (e.g. 22:00 - 02:00)
        // Valid for today if time < prevEnd (e.g. 01:00 < 02:00)
        if (prevStart >= prevEnd) {
            if (apptStart < prevEnd) {
                return true;
            }
        }
    }

    // 2. Check Current Day
    const schedule = attendant.schedule?.[dayKey];
    if (!schedule || !schedule.start || !schedule.end) return false;

    const startMinutes = timeToMinutes(schedule.start);
    let endMinutes = timeToMinutes(schedule.end);
    if (endMinutes === 0) endMinutes = 1440;

    // Normal Shift
    if (startMinutes < endMinutes) {
        if (apptStart < startMinutes || apptEnd > endMinutes) {
            return false;
        }
    }
    // Overnight Shift (starts today, ends tomorrow)
    else {
        // Valid if starts after shift start (e.g. 23:00 >= 22:00)
        if (apptStart < startMinutes) {
            return false;
        }
    }

    // Check pauses
    // Interval [apptStart, apptEnd) must not overlap with any pause [pauseStart, pauseEnd)
    if (attendant.pauses && attendant.pauses[dayKey] && attendant.pauses[dayKey].length > 0) {
        for (const pause of attendant.pauses[dayKey]) {
            const pauseStart = timeToMinutes(pause.start);
            const pauseEnd = timeToMinutes(pause.end);

            // Check for overlap: (StartA < EndB) and (EndA > StartB)
            if (apptStart < pauseEnd && apptEnd > pauseStart) {
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
    allAppointments: Appointment[],
    excludeAppointmentId?: string
): boolean => {
    const newStart = timeToMinutes(timeStr);
    const newEnd = newStart + getDuration(newAppointmentType);

    return allAppointments.some(appt => {
        // Exclude self if updating
        if (excludeAppointmentId && appt.id === excludeAppointmentId) return false;

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
    // 1. Determine Target Sector based on appointment type
    const isCloserType = ['Ligação Closer', 'Gold Call', 'Reagendamento Closer', 'Upgrade'].includes(appointmentType);
    const targetSector = isCloserType ? 'Closer' : null;

    // Filter attendants based on target sector if applicable
    const eligibleAttendants = targetSector
        ? attendants.filter(a => a.sector === targetSector)
        : attendants; // Otherwise, use provided attendants (already filtered by event context in AppointmentForm)

    if (eligibleAttendants.length === 0) return null;

    // 2. Filter by Schedule (who is working today?)
    const withSchedule = eligibleAttendants.filter(a =>
        isAttendantWithinSchedule(a, dateStr, timeStr, appointmentType)
    );

    if (withSchedule.length === 0) return null;

    // 3. Calculate Load (count pending appointments for this day)
    const withLoad = withSchedule.map(a => {
        const count = allAppointments.filter(appt =>
            appt.attendantId === a.id &&
            appt.date === dateStr &&
            appt.status === 'Pendente' &&
            appt.type !== 'Agendamento Pessoal'
        ).length;

        return { ...a, load: count };
    });

    // 4. Sort by Load (asc) then Random
    withLoad.sort((a, b) => {
        if (a.load !== b.load) return a.load - b.load;
        return Math.random() - 0.5;
    });

    // 5. Find first one without conflict
    for (const attendant of withLoad) {
        if (!hasConflictingAppointment(attendant.id, dateStr, timeStr, appointmentType, allAppointments)) {
            return attendant;
        }
    }

    return null;
};
