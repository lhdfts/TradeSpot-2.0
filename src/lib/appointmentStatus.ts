// Status exibido na tela. "Iniciando" e "Ao Vivo" existem só no front: no
// banco o agendamento continua "Pendente" até o atendente registrar o resultado.

import type { Appointment, AppointmentStatus } from '../types';
import { appointmentStart, brazilDateISO } from './dates';

export type DisplayStatus = AppointmentStatus | 'Iniciando' | 'Ao Vivo';

const STARTING_WINDOW_MS = 5 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

/**
 * Enquanto o status no banco for "Pendente":
 * - "Iniciando": faltam 5 minutos ou menos para começar;
 * - "Ao Vivo": entre o início e o término (end_time);
 * - depois do término volta a "Pendente".
 * Qualquer outro status (Realizado, No-show, Reagendado, Cancelado,
 * Esquecimento) aparece como está.
 */
export function getDisplayStatus(appt: Pick<Appointment, 'status' | 'date' | 'time' | 'end_time'>, now: number): DisplayStatus {
    if (appt.status !== 'Pendente' || !appt.time) return appt.status;
    const start = appointmentStart(appt.date, appt.time);
    if (Number.isNaN(start)) return appt.status;

    if (now < start) {
        return now >= start - STARTING_WINDOW_MS ? 'Iniciando' : appt.status;
    }

    let end = appt.end_time ? appointmentStart(appt.date, appt.end_time) : NaN;
    if (Number.isNaN(end)) {
        // Sem término registrado: "Ao Vivo" até o fim do dia do agendamento.
        return appt.date === brazilDateISO(now) ? 'Ao Vivo' : appt.status;
    }
    if (end <= start) end += DAY_MS; // atravessa a meia-noite (ex.: 23:45–00:15)
    return now < end ? 'Ao Vivo' : appt.status;
}
