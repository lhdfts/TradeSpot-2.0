const fs = require('fs');
const esc = fs.readFileSync('escalas', 'utf-8');
const escalasRaw = JSON.parse(esc);
const agendamentos = JSON.parse(fs.readFileSync('agendamentos', 'utf-8'));

const attendants = escalasRaw.map(a => {
    return {
        ...a,
        scheduleStr: a.schedule,
        schedule: a.schedule ? JSON.parse(a.schedule) : null,
        pauses: a.pauses ? JSON.parse(a.pauses) : null,
    };
});

agendamentos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

const DAY_MAP = {
    1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun'
};

const timeToMinutes = (time) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const getDuration = (type) => {
    if (type === 'Ligação SDR') return 30;
    return 60;
};

const evaluateAttendant = (attendant, dateStr, timeStr, apptType, existingAppts, currentApptCreatedAt) => {
    if (!attendant.schedule) return { isValid: false, reason: "Sem escala configurada" };

    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayKey = DAY_MAP[date.getDay()];

    const prevDate = new Date(date);
    prevDate.setDate(date.getDate() - 1);
    const prevDayKey = DAY_MAP[prevDate.getDay()];

    const schedule = attendant.schedule[dayKey];
    const prevSchedule = attendant.schedule[prevDayKey];

    const apptStart = timeToMinutes(timeStr);
    const duration = getDuration(apptType);
    const apptEnd = apptStart + duration;

    let withinShift = false;

    // Check Previous Day Spillover
    if (prevSchedule) {
        const prevStart = timeToMinutes(prevSchedule.start);
        let prevEnd = timeToMinutes(prevSchedule.end);
        if (prevEnd === 0) prevEnd = 1440;
        if (prevStart >= prevEnd) {
            if (apptStart < prevEnd) {
                withinShift = true;
            }
        }
    }

    if (!withinShift && schedule) {
        const startMinutes = timeToMinutes(schedule.start);
        let endMinutes = timeToMinutes(schedule.end);
        if (endMinutes === 0) endMinutes = 1440;

        if (startMinutes < endMinutes) {
            if (apptStart >= startMinutes && apptEnd <= endMinutes) {
                withinShift = true;
            }
        } else {
            if (apptStart >= startMinutes) {
                withinShift = true;
            }
        }
    }

    if (!withinShift) return { isValid: false, reason: "Fora do horário de escala (" + timeStr + ")" };

    if (attendant.pauses && attendant.pauses[dayKey]) {
        for (const pause of attendant.pauses[dayKey]) {
            const pauseStart = timeToMinutes(pause.start);
            const pauseEnd = timeToMinutes(pause.end);
            if (apptStart < pauseEnd && apptEnd > pauseStart) {
                return { isValid: false, reason: `Em pausa (${pause.start} - ${pause.end})` };
            }
        }
    }

    // Check double booking
    const newStart = apptStart;
    const newEnd = apptEnd;

    for (const appt of existingAppts) {
        if (appt.attendant_id === attendant.id) {
            // Historicamente temos que assumir que estavam pendentes na hora da criação
            const existingStart = timeToMinutes(appt.time);
            const apptDur = getDuration(appt.type);
            const existingEnd = existingStart + apptDur;
            if (newStart < existingEnd && newEnd > existingStart) {
                return { isValid: false, reason: `Conflito de Choque de Horário (Agendamento já ativo às ${appt.time.substring(0, 5)})` };
            }
        }
    }

    return { isValid: true, reason: "Válido" };
};

// Helper: subtract 3 hours to format created_at for printing
const formatBRT = (dateStr) => {
    const d = new Date(dateStr);
    d.setHours(d.getHours() - 3);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

let finalOutput = "=== ANÁLISE COMPLETA DE DISTRIBUIÇÃO E MOTIVOS ===\n";
let i = 1;

for (const appt of agendamentos) {
    const createdDate = new Date(appt.created_at);
    // Filtrar criados após 11 de mar 18:00:00 BRT -> que é 21:00 UTC
    const cutoff = new Date('2026-03-11T21:00:00Z');
    
    if (createdDate >= cutoff) {
        const dateForAppt = appt.date;
        const apptTime = typeof appt.time === 'string' && appt.time.length >= 5 ? appt.time.substring(0, 5) : '00:00';
        const attendantSelected = attendants.find(a => a.id === appt.attendant_id);
        const nameSelected = attendantSelected ? attendantSelected.name : "NÃO ENCONTRADO";
        
        let report = `\n--------------------------------------------------------------------------------------\n`;
        report += `[${i}] Agendamento ID: ${appt.id.split('-')[0]} | Data do compromisso: ${dateForAppt} às ${apptTime} | Criado em: ${formatBRT(appt.created_at)} (BRT)\n`;
        report += `    --> SELECIONADO O CLOSER: ${nameSelected}\n`;
        report += `    Cálculo de Disponibilidade e Escala na fração de segundo da criação:\n`;

        // Find all active appointments BEFORE this one, to pass as context checking conflicts AND loads
        const priorAppts = agendamentos.filter(a => {
            const aDate = new Date(a.created_at);
            // Ignorar agendamentos Cancelados, pois provavelmente eram testes ou caíram rápido,
            // mas manter os demais (Realizado, No-show) que na hora deveriam estar Pendentes.
            return a.date === dateForAppt && aDate < createdDate && a.status !== 'Cancelado';
        });

        for (const a of attendants) {
            const evaluation = evaluateAttendant(a, dateForAppt, apptTime, appt.type, priorAppts, appt.created_at);
            const isSelected = a.id === appt.attendant_id ? '  <-- EXATAMENTE QUEM RECEBEU ✔️' : '';
            
            if (evaluation.isValid) {
                // Calculate load for the valid day baseando-se no histórico
                const load = priorAppts.filter(p => p.attendant_id === a.id).length;
                report += `      🟢 [VÁLIDO] ${a.name} | Carga pendente pro dia: ${load}${isSelected}\n`;
            } else {
                report += `      🔴 [INVÁLIDO] ${a.name} | Motivo: ${evaluation.reason}${isSelected}\n`;
            }
        }

        finalOutput += report;
        i++;
    }
}

fs.writeFileSync('relatorio_corrigido.txt', finalOutput, 'utf8');
