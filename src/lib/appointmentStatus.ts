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

// Fonte única das cores de status. As classes usam os tokens status-* (tons
// 700 no tema claro, neon no escuro); `chart` serve para estilos inline/recharts.
export interface StatusColor {
    badge: string;
    dot: string;
    text: string;
    chart: string;
}

export const STATUS_COLORS: Record<DisplayStatus, StatusColor> = {
    Realizado: {
        badge: 'bg-status-realizado/10 text-status-realizado border-status-realizado/25',
        dot: 'bg-status-realizado',
        text: 'text-status-realizado',
        chart: 'rgb(var(--status-realizado))',
    },
    Pendente: {
        badge: 'bg-status-pendente/10 text-status-pendente border-status-pendente/25',
        dot: 'bg-status-pendente',
        text: 'text-status-pendente',
        chart: 'rgb(var(--status-pendente))',
    },
    Cancelado: {
        badge: 'bg-status-cancelado/10 text-status-cancelado border-status-cancelado/25',
        dot: 'bg-status-cancelado',
        text: 'text-status-cancelado',
        chart: 'rgb(var(--status-cancelado))',
    },
    Reagendado: {
        badge: 'bg-status-reagendado/10 text-status-reagendado border-status-reagendado/25',
        dot: 'bg-status-reagendado',
        text: 'text-status-reagendado',
        chart: 'rgb(var(--status-reagendado))',
    },
    Esquecimento: {
        badge: 'bg-status-esquecimento/10 text-status-esquecimento border-status-esquecimento/25',
        dot: 'bg-status-esquecimento',
        text: 'text-status-esquecimento',
        chart: 'rgb(var(--status-esquecimento))',
    },
    'No-show': {
        badge: 'bg-status-noshow/10 text-status-noshow border-status-noshow/25',
        dot: 'bg-status-noshow',
        text: 'text-status-noshow',
        chart: 'rgb(var(--status-noshow))',
    },
    // Só do front: no banco continuam "Pendente".
    Iniciando: {
        badge: 'bg-status-iniciando/10 text-status-iniciando border-status-iniciando/30',
        dot: 'bg-status-iniciando',
        text: 'text-status-iniciando',
        chart: 'rgb(var(--status-iniciando))',
    },
    // Vermelho sólido com texto branco (e não o tom claro do Cancelado) para não confundir os dois.
    'Ao Vivo': {
        badge: 'bg-[#FF1744] text-white border-[#FF1744]',
        dot: 'bg-white',
        text: 'text-status-cancelado',
        chart: 'rgb(var(--status-cancelado))',
    },
};

/** Cor da linha/rótulos do "Total" nos gráficos (legível nos dois temas). */
export const STATUS_TOTAL_CHART = 'rgb(var(--status-total))';

export const STATUS_COLOR_FALLBACK: StatusColor = {
    badge: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
    text: 'text-muted-foreground',
    chart: 'rgb(var(--status-pendente))',
};

export function getStatusColor(status: string): StatusColor {
    return STATUS_COLORS[status as DisplayStatus] ?? STATUS_COLOR_FALLBACK;
}
