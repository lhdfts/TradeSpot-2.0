"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAvailableCloser = exports.findAvailableCloserWithLogs = exports.hasSectorTimeLimit = exports.hasConflictingAppointment = exports.isAttendantWithinSchedule = exports.generateAllTimes = exports.getDuration = void 0;
// Map JS day index (0-6) to our type's schedule keys
const DAY_MAP = {
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
    0: 'sun'
};
const timeToMinutes = (time) => {
    if (!time || typeof time !== 'string')
        return 0;
    const timePart = time.includes('T') ? time.split('T')[1] : time;
    const cleanTime = timePart.split(/[Z+-]/)[0];
    const match = cleanTime.match(/^(\d{1,2}):(\d{2})/);
    if (!match)
        return 0;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    return h * 60 + m;
};
const getDuration = (_type, durationMinutes = 60) => {
    return durationMinutes;
};
exports.getDuration = getDuration;
const generateAllTimes = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute of [0, 15, 30, 45]) {
            const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            times.push(timeStr);
        }
    }
    return times;
};
exports.generateAllTimes = generateAllTimes;
const isAttendantWithinSchedule = (attendant, dateStr, // YYYY-MM-DD
timeStr, // HH:MM
appointmentType, // Added type to calculate duration
durationMinutes = 60) => {
    var _a, _b;
    if (!attendant.schedule)
        return false;
    // Parse date to get day of week safely
    let year, month, day;
    if (dateStr.includes('/')) {
        [day, month, year] = dateStr.split('/').map(Number);
    }
    else {
        [year, month, day] = dateStr.split('-').map(Number);
    }
    const date = new Date(year, month - 1, day);
    const dayKey = DAY_MAP[date.getDay()];
    // Check Previous Day for Overnight Spillover
    const prevDate = new Date(date);
    prevDate.setDate(date.getDate() - 1);
    const prevDayKey = DAY_MAP[prevDate.getDay()];
    const apptStart = timeToMinutes(timeStr);
    const duration = (0, exports.getDuration)(appointmentType, durationMinutes);
    const apptEnd = apptStart + duration;
    // 1. Check Previous Day Spillover
    const prevSchedule = (_a = attendant.schedule) === null || _a === void 0 ? void 0 : _a[prevDayKey];
    if (prevSchedule && prevSchedule.start && prevSchedule.end) {
        const prevStart = timeToMinutes(prevSchedule.start);
        let prevEnd = timeToMinutes(prevSchedule.end);
        if (prevEnd === 0)
            prevEnd = 1440; // Treat 00:00 as 24:00
        // If overnight shift yesterday (e.g. 22:00 - 02:00)
        // Valid for today if time < prevEnd (e.g. 01:00 < 02:00)
        if (prevStart >= prevEnd) {
            if (apptStart < prevEnd) {
                return true;
            }
        }
    }
    // 2. Check Current Day
    const schedule = (_b = attendant.schedule) === null || _b === void 0 ? void 0 : _b[dayKey];
    if (!schedule || !schedule.start || !schedule.end)
        return false;
    const startMinutes = timeToMinutes(schedule.start);
    let endMinutes = timeToMinutes(schedule.end);
    // Apply logic: treat as "crossed midnight" if end <= start
    if (endMinutes <= startMinutes && endMinutes !== 0) {
        endMinutes += 1440;
    }
    else if (endMinutes === 0) {
        endMinutes = 1440;
    }
    // Normal or Overnight Shift (now unified range)
    if (apptStart < startMinutes || apptEnd > endMinutes)
        return false;
    // Check pauses
    if (attendant.pauses && attendant.pauses[dayKey] && attendant.pauses[dayKey].length > 0) {
        for (const pause of attendant.pauses[dayKey]) {
            const pauseStart = timeToMinutes(pause.start);
            let pauseEnd = timeToMinutes(pause.end);
            // Apply same midnight logic for pauses
            if (pauseEnd <= pauseStart && pauseEnd !== 0) {
                pauseEnd += 1440;
            }
            else if (pauseEnd === 0) {
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
exports.isAttendantWithinSchedule = isAttendantWithinSchedule;
const hasConflictingAppointment = (attendantId, dateStr, timeStr, newAppointmentType, allAppointments, excludeAppointmentId, durationMinutes = 60) => {
    const newStart = timeToMinutes(timeStr);
    const newEnd = newStart + (0, exports.getDuration)(newAppointmentType, durationMinutes);
    return allAppointments.some(appt => {
        // Exclude self if updating
        if (excludeAppointmentId && appt.id === excludeAppointmentId)
            return false;
        // Filter by attendant
        if (appt.attendantId !== attendantId)
            return false;
        // Filter by date
        if (appt.date !== dateStr)
            return false;
        // Filter by status (ONLY 'Pendente' blocks time, matching reference)
        if (appt.status !== 'Pendente')
            return false;
        // Check overlap
        const existingStart = timeToMinutes(appt.time);
        // Use end_time from DB if available, otherwise calculate it
        let existingEnd;
        if (appt.end_time) {
            existingEnd = timeToMinutes(appt.end_time);
            // APPLY USER LOGIC: if end_time <= start_time, it crossed midnight
            if (existingEnd <= existingStart && existingEnd !== 0) {
                existingEnd += 1440;
            }
            else if (existingEnd === 0 && existingStart > 0) {
                existingEnd = 1440;
            }
        }
        else {
            existingEnd = existingStart + (0, exports.getDuration)(appt.type);
        }
        // Conflict if overlap exists
        return newStart < existingEnd && newEnd > existingStart;
    });
};
exports.hasConflictingAppointment = hasConflictingAppointment;
const hasSectorTimeLimit = (sector, dateStr, timeStr, appointmentType, allAppointments, attendants, excludeAppointmentId) => {
    if (sector !== 'Aldeia' && sector !== 'Tribo')
        return false;
    if (appointmentType === 'Agendamento Pessoal')
        return false;
    const sectorAttendants = new Set(attendants.filter(a => a.sector === sector).map(a => a.id));
    const newStart = timeToMinutes(timeStr);
    const newEnd = newStart + (0, exports.getDuration)(appointmentType);
    let concurrentCount = 0;
    for (const appt of allAppointments) {
        if (excludeAppointmentId && appt.id === excludeAppointmentId)
            continue;
        if (appt.status !== 'Pendente')
            continue;
        if (appt.type === 'Agendamento Pessoal')
            continue;
        if (appt.date !== dateStr)
            continue;
        if (!sectorAttendants.has(appt.attendantId))
            continue;
        const existingStart = timeToMinutes(appt.time);
        let existingEnd;
        if (appt.end_time) {
            existingEnd = timeToMinutes(appt.end_time);
            if (existingEnd <= existingStart && existingEnd !== 0)
                existingEnd += 1440;
            else if (existingEnd === 0 && existingStart > 0)
                existingEnd = 1440;
        }
        else {
            existingEnd = existingStart + (0, exports.getDuration)(appt.type);
        }
        if (newStart < existingEnd && newEnd > existingStart) {
            concurrentCount++;
        }
    }
    return concurrentCount >= 2;
};
exports.hasSectorTimeLimit = hasSectorTimeLimit;
const findAvailableCloserWithLogs = (dateStr, timeStr, appointmentType, attendants, allAppointments, options = {}) => {
    const checksLog = [];
    if (options.sectorLimit && (0, exports.hasSectorTimeLimit)(options.sectorLimit, dateStr, timeStr, appointmentType, allAppointments, attendants)) {
        for (const att of attendants) {
            checksLog.push({ name: att.name, reason: "Limite diário de agendamentos do setor atingido" });
        }
        return { attendant: null, checksLog };
    }
    const isCloserType = ['Ligação Closer', 'Gold Call', 'Reagendamento Closer', 'Upgrade', 'Fora da agenda', 'Fechamento'].includes(appointmentType);
    const eligibleAttendants = (appointmentType === 'Ligação Equipe Aldeia'
        ? attendants.filter(a => a.sector === 'Aldeia')
        : (isCloserType ? attendants.filter(a => ['Closer', 'Co-líder'].includes(a.sector) || a.role === 'Co-líder') : attendants)).filter(a => a.role !== 'Líder');
    if (eligibleAttendants.length === 0)
        return { attendant: null, checksLog };
    const available = [];
    for (const a of eligibleAttendants) {
        if (!options.ignoreSchedule) {
            const within = (0, exports.isAttendantWithinSchedule)(a, dateStr, timeStr, appointmentType, options.durationMinutes);
            if (!within) {
                let year, month, day;
                if (dateStr.includes('/')) {
                    [day, month, year] = dateStr.split('/').map(Number);
                }
                else {
                    [year, month, day] = dateStr.split('-').map(Number);
                }
                const dateObj = new Date(year, month - 1, day);
                const dayKey = DAY_MAP[dateObj.getDay()];
                const apptStart = timeToMinutes(timeStr);
                const duration = (0, exports.getDuration)(appointmentType, options.durationMinutes);
                const apptEnd = apptStart + duration;
                let isPause = false;
                if (a.pauses && a.pauses[dayKey]) {
                    for (const pause of a.pauses[dayKey]) {
                        const pauseStart = timeToMinutes(pause.start);
                        let pauseEnd = timeToMinutes(pause.end);
                        if (pauseEnd <= pauseStart && pauseEnd !== 0)
                            pauseEnd += 1440;
                        else if (pauseEnd === 0)
                            pauseEnd = 1440;
                        if (apptStart < pauseEnd && apptEnd > pauseStart) {
                            isPause = true;
                            break;
                        }
                    }
                }
                if (isPause) {
                    checksLog.push({ name: a.name, reason: "Em pausa" });
                }
                else {
                    checksLog.push({ name: a.name, reason: "Fora da escala" });
                }
                continue;
            }
        }
        available.push(a);
    }
    if (available.length === 0)
        return { attendant: null, checksLog };
    const attendantsWithLoad = available.map(attendant => {
        const count = allAppointments.filter(appt => appt.attendantId === attendant.id &&
            appt.date === dateStr &&
            appt.status === 'Pendente' &&
            appt.type !== 'Agendamento Pessoal').length;
        return Object.assign(Object.assign({}, attendant), { load: count });
    });
    attendantsWithLoad.sort((a, b) => {
        if (a.load !== b.load)
            return a.load - b.load;
        return Math.random() - 0.5;
    });
    let selectedAtt = null;
    for (const attendant of attendantsWithLoad) {
        if (!selectedAtt && !(0, exports.hasConflictingAppointment)(attendant.id, dateStr, timeStr, appointmentType, allAppointments, undefined, options.durationMinutes)) {
            selectedAtt = attendant;
            checksLog.push({ name: attendant.name, reason: "Recebeu o último agendamento", selected: true });
        }
        else if (!selectedAtt) {
            checksLog.push({ name: attendant.name, reason: "Já possuia agendamento para o horario escolhido" });
        }
        else {
            checksLog.push({ name: attendant.name, reason: "Disponível (menor prioridade/carga maior)" });
        }
    }
    return { attendant: selectedAtt, checksLog };
};
exports.findAvailableCloserWithLogs = findAvailableCloserWithLogs;
const findAvailableCloser = (dateStr, timeStr, appointmentType, attendants, allAppointments, options = {}) => {
    const res = (0, exports.findAvailableCloserWithLogs)(dateStr, timeStr, appointmentType, attendants, allAppointments, options);
    return res.attendant;
};
exports.findAvailableCloser = findAvailableCloser;
