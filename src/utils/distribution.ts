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
    if (!time || typeof time !== 'string') return 0;

    const timePart = time.includes('T') ? time.split('T')[1] : time;
    const cleanTime = timePart.split(/[Z+-]/)[0];
    const match = cleanTime.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return 0;

    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    return h * 60 + m;
};

export const getDuration = (_type?: string, durationMinutes: number = 60): number => {
    return durationMinutes;
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
    appointmentType: string, // Added type to calculate duration
    durationMinutes: number = 60
): boolean => {
    if (!attendant.schedule) return false;

    // Parse date to get day of week safely
    let year: number, month: number, day: number;
    if (dateStr.includes('/')) {
        [day, month, year] = dateStr.split('/').map(Number);
    } else {
        [year, month, day] = dateStr.split('-').map(Number);
    }
    const date = new Date(year, month - 1, day);
    const dayKey = DAY_MAP[date.getDay()];

    // Check Previous Day for Overnight Spillover
    const prevDate = new Date(date);
    prevDate.setDate(date.getDate() - 1);
    const prevDayKey = DAY_MAP[prevDate.getDay()];

    const apptStart = timeToMinutes(timeStr);
    const duration = getDuration(appointmentType, durationMinutes);
    const apptEnd = apptStart + duration;

    // 1. Check Previous Day Spillover
    const prevSchedule = attendant.schedule?.[prevDayKey];
    if (prevSchedule && prevSchedule.start && prevSchedule.end) {
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

    // Apply logic: treat as "crossed midnight" if end <= start
    if (endMinutes <= startMinutes && endMinutes !== 0) {
        endMinutes += 1440;
    } else if (endMinutes === 0) {
        endMinutes = 1440;
    }

    // Normal or Overnight Shift (now unified range)
    if (apptStart < startMinutes || apptEnd > endMinutes) return false;

    // Check pauses
    if (attendant.pauses && attendant.pauses[dayKey] && attendant.pauses[dayKey].length > 0) {
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
    excludeAppointmentId?: string,
    durationMinutes: number = 60
): boolean => {
    const newStart = timeToMinutes(timeStr);
    const newEnd = newStart + getDuration(newAppointmentType, durationMinutes);

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

        // Conflict if overlap exists
        return newStart < existingEnd && newEnd > existingStart;
    });
};

export const hasSectorTimeLimit = (
    sector: string,
    dateStr: string,
    timeStr: string,
    appointmentType: string,
    allAppointments: Appointment[],
    attendants: Attendant[],
    excludeAppointmentId?: string
): boolean => {
    if (sector !== 'Aldeia' && sector !== 'Tribo') return false;
    if (appointmentType === 'Agendamento Pessoal') return false;

    const sectorAttendants = new Set(attendants.filter(a => a.sector === sector).map(a => a.id));
    
    const newStart = timeToMinutes(timeStr);
    const newEnd = newStart + getDuration(appointmentType);

    let concurrentCount = 0;

    for (const appt of allAppointments) {
        if (excludeAppointmentId && appt.id === excludeAppointmentId) continue;
        if (appt.status !== 'Pendente') continue;
        if (appt.type === 'Agendamento Pessoal') continue;
        if (appt.date !== dateStr) continue;
        if (!sectorAttendants.has(appt.attendantId)) continue; 

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

export interface CheckLogItem {
    name: string;
    reason: string;
    selected?: boolean;
}

export const findAvailableCloserWithLogs = (
    dateStr: string,
    timeStr: string,
    appointmentType: string,
    attendants: Attendant[],
    allAppointments: Appointment[],
    options: { ignoreSchedule?: boolean, sectorLimit?: string, durationMinutes?: number } = {}
): { attendant: Attendant | null, checksLog: CheckLogItem[] } => {
    const checksLog: CheckLogItem[] = [];
    if (options.sectorLimit && hasSectorTimeLimit(options.sectorLimit, dateStr, timeStr, appointmentType, allAppointments, attendants)) {
        for (const att of attendants) {
            checksLog.push({ name: att.name, reason: "Limite diário de agendamentos do setor atingido" });
        }
        return { attendant: null, checksLog };
    }

    const isCloserType = ['Ligação Closer', 'Gold Call', 'Reagendamento Closer', 'Upgrade', 'Fora da agenda', 'Fechamento'].includes(appointmentType);
    const eligibleAttendants = (
        appointmentType === 'Ligação Equipe Aldeia'
            ? attendants.filter(a => a.sector === 'Aldeia')
            : (isCloserType ? attendants.filter(a => ['Closer', 'Co-líder'].includes(a.sector) || a.role === 'Co-líder') : attendants)
    ).filter(a => a.role !== 'Líder');

    if (eligibleAttendants.length === 0) return { attendant: null, checksLog };

    if (appointmentType === 'Fechamento') {
        const sortedAlphabetical = [...eligibleAttendants].sort((a, b) => a.name.localeCompare(b.name));
        const existingCount = allAppointments.filter(appt => appt.type === 'Fechamento').length;
        const startIndex = existingCount % sortedAlphabetical.length;

        let selectedCandidate: Attendant | null = null;
        for (let i = 0; i < sortedAlphabetical.length; i++) {
            const candidateIdx = (startIndex + i) % sortedAlphabetical.length;
            const candidate = sortedAlphabetical[candidateIdx];

            if (!selectedCandidate && (options.ignoreSchedule || isAttendantWithinSchedule(candidate, dateStr, timeStr, appointmentType, options.durationMinutes))) {
                selectedCandidate = candidate;
                checksLog.push({ name: candidate.name, reason: "Recebeu o agendamento (rodízio Fechamento)", selected: true });
            } else if (!selectedCandidate) {
                checksLog.push({ name: candidate.name, reason: "Fora da escala" });
            } else {
                checksLog.push({ name: candidate.name, reason: "Disponível (próximo no rodízio)" });
            }
        }
        return { attendant: selectedCandidate, checksLog };
    }

    const available: Attendant[] = [];
    for (const a of eligibleAttendants) {
        if (!options.ignoreSchedule) {
            const within = isAttendantWithinSchedule(a, dateStr, timeStr, appointmentType, options.durationMinutes);
            if (!within) {
                let year: number, month: number, day: number;
                if (dateStr.includes('/')) {
                    [day, month, year] = dateStr.split('/').map(Number);
                } else {
                    [year, month, day] = dateStr.split('-').map(Number);
                }
                const dateObj = new Date(year, month - 1, day);
                const dayKey = DAY_MAP[dateObj.getDay()];
                const apptStart = timeToMinutes(timeStr);
                const duration = getDuration(appointmentType, options.durationMinutes);
                const apptEnd = apptStart + duration;

                let isPause = false;
                if (a.pauses && a.pauses[dayKey]) {
                    for (const pause of a.pauses[dayKey]) {
                        const pauseStart = timeToMinutes(pause.start);
                        let pauseEnd = timeToMinutes(pause.end);
                        if (pauseEnd <= pauseStart && pauseEnd !== 0) pauseEnd += 1440;
                        else if (pauseEnd === 0) pauseEnd = 1440;

                        if (apptStart < pauseEnd && apptEnd > pauseStart) {
                            isPause = true;
                            break;
                        }
                    }
                }

                if (isPause) {
                    checksLog.push({ name: a.name, reason: "Em pausa" });
                } else {
                    checksLog.push({ name: a.name, reason: "Fora da escala" });
                }
                continue;
            }
        }
        available.push(a);
    }

    if (available.length === 0) return { attendant: null, checksLog };

    const attendantsWithLoad = available.map(attendant => {
        const count = allAppointments.filter(appt =>
            appt.attendantId === attendant.id &&
            appt.date === dateStr &&
            appt.status === 'Pendente' &&
            appt.type !== 'Agendamento Pessoal'
        ).length;

        return { ...attendant, load: count };
    });

    attendantsWithLoad.sort((a, b) => {
        if (a.load !== b.load) return a.load - b.load;
        return Math.random() - 0.5;
    });

    let selectedAtt: Attendant | null = null;
    for (const attendant of attendantsWithLoad) {
        if (!selectedAtt && !hasConflictingAppointment(attendant.id, dateStr, timeStr, appointmentType, allAppointments, undefined, options.durationMinutes)) {
            selectedAtt = attendant;
            checksLog.push({ name: attendant.name, reason: "Recebeu o último agendamento", selected: true });
        } else if (!selectedAtt) {
            checksLog.push({ name: attendant.name, reason: "Já possuia agendamento para o horario escolhido" });
        } else {
            checksLog.push({ name: attendant.name, reason: "Disponível (menor prioridade/carga maior)" });
        }
    }

    return { attendant: selectedAtt, checksLog };
};

export const findAvailableCloser = (
    dateStr: string,
    timeStr: string,
    appointmentType: string,
    attendants: Attendant[],
    allAppointments: Appointment[],
    options: { ignoreSchedule?: boolean, sectorLimit?: string, durationMinutes?: number } = {}
): Attendant | null => {
    const res = findAvailableCloserWithLogs(dateStr, timeStr, appointmentType, attendants, allAppointments, options);
    return res.attendant;
};
