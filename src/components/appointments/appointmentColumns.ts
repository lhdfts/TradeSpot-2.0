// Colunas opcionais das listas de agendamentos (Meus e Todos). Data/Hora,
// Aluno(a) e Status são fixas e ficam no AppointmentsListView; aqui está só o
// que a pessoa pode ligar e desligar pelo botão "Colunas".
import { useCallback, useMemo, useState } from 'react';
import type { Appointment, Attendant, Event } from '../../types';

export type AppointmentColumnId =
    | 'type' | 'owner' | 'creator' | 'attendant' | 'sector' | 'event' | 'email'
    | 'profession' | 'pain' | 'interestProduct' | 'knowledge' | 'interest' | 'additionalInfo';

/** Nomes que a lista sozinha não tem (vêm de atendentes e eventos já carregados pela página). */
export interface ColumnLookups {
    userName: (id?: string | null) => string | undefined;
    userSector: (id?: string | null) => string | undefined;
    eventName: (id?: string | null) => string | undefined;
}

/** Monta os lookups a partir de atendentes e eventos que a página já carregou. */
export const useColumnLookups = (attendants: Attendant[], events: Event[]): ColumnLookups =>
    useMemo(() => {
        const users = new Map(attendants.map(a => [a.id, a]));
        const eventNames = new Map(events.map(e => [e.id, e.event_name]));
        return {
            userName: id => (id ? users.get(id)?.name : undefined),
            userSector: id => (id ? users.get(id)?.sector : undefined),
            eventName: id => (id ? eventNames.get(id) : undefined),
        };
    }, [attendants, events]);

/** Escolher colunas é para quem está acima de Colaborador. */
export const canChooseColumns = (role?: string) => !!role && role !== 'Colaborador';

export interface OptionalColumn {
    id: AppointmentColumnId;
    header: string;
    /** Largura em px; a tabela cresce e ganha rolagem horizontal em vez de espremer o texto. */
    width: number;
    /** Fica antes da coluna fixa Status (como o Tipo sempre esteve). */
    beforeStatus?: boolean;
    value: (appt: Appointment, lookups: ColumnLookups) => string | null | undefined;
}

// A ordem aqui é a ordem na tabela.
export const OPTIONAL_COLUMNS: OptionalColumn[] = [
    { id: 'type', header: 'Tipo', width: 150, beforeStatus: true, value: a => a.type },
    { id: 'owner', header: 'Responsável', width: 170, value: (a, l) => a.ownerName || l.userName(a.ownerId ?? a.createdBy) },
    { id: 'creator', header: 'Criado Por', width: 170, value: (a, l) => l.userName(a.createdBy) },
    { id: 'attendant', header: 'Atendente', width: 170, value: (a, l) => a.attendantName || l.userName(a.attendantId) },
    { id: 'sector', header: 'Setor', width: 120, value: (a, l) => l.userSector(a.attendantId) },
    { id: 'event', header: 'Evento', width: 180, value: (a, l) => l.eventName(a.eventId) },
    { id: 'email', header: 'E-mail', width: 210, value: a => a.email },
    { id: 'profession', header: 'Profissão', width: 170, value: a => a.profession },
    { id: 'pain', header: 'Dor', width: 190, value: a => a.pain },
    { id: 'interestProduct', header: 'Produto de Interesse', width: 150, value: a => a.interestProduct },
    { id: 'knowledge', header: 'Perfil de Conhecimento', width: 160, value: a => a.studentProfile?.knowledge },
    { id: 'interest', header: 'Perfil de Interesse', width: 140, value: a => a.studentProfile?.interest },
    { id: 'additionalInfo', header: 'Informações Adicionais', width: 260, value: a => a.additionalInfo },
];

const VALID_IDS = new Set<string>(OPTIONAL_COLUMNS.map(c => c.id));

/**
 * Colunas escolhidas, guardadas no navegador (por tela e por usuário). Sem
 * permissão de escolher, valem sempre as colunas padrão da tela.
 */
const readSaved = (key: string): AppointmentColumnId[] | null => {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed.filter((id): id is AppointmentColumnId => typeof id === 'string' && VALID_IDS.has(id));
    } catch {
        return null; // sem localStorage (aba anônima, bloqueio): fica o padrão
    }
};

export const useColumnPreferences = (storageKey: string, defaults: AppointmentColumnId[], enabled: boolean) => {
    const key = `tradespot:colunas:${storageKey}`;

    // A chave leva o id do usuário, que pode chegar depois da 1ª renderização:
    // quando ela muda, relê o que estava salvo para a chave nova.
    const [state, setState] = useState(() => ({ key, saved: readSaved(key) }));
    if (state.key !== key) setState({ key, saved: readSaved(key) });
    const saved = state.key === key ? state.saved : null;

    const visible = enabled && saved ? saved : defaults;

    const persist = useCallback((next: AppointmentColumnId[] | null) => {
        setState({ key, saved: next });
        try {
            if (next) window.localStorage.setItem(key, JSON.stringify(next));
            else window.localStorage.removeItem(key);
        } catch {
            // a escolha vale até recarregar a página
        }
    }, [key]);

    const toggle = useCallback((id: AppointmentColumnId) => {
        const current = saved ?? defaults;
        persist(current.includes(id) ? current.filter(c => c !== id) : [...current, id]);
    }, [saved, defaults, persist]);

    const reset = useCallback(() => persist(null), [persist]);

    const isDefault = !saved || (saved.length === defaults.length && saved.every(id => defaults.includes(id)));

    return { visible, toggle, reset, isDefault };
};
