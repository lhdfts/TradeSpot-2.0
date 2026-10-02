import { canViewAllSectors, getAllowedSectors } from './security';
import { SECTOR_PRE_VENDAS, normalizeSector } from '../constants/sectors';
import { APPOINTMENT_STATUSES, type Appointment, type AppointmentStatus, type Attendant } from '../types';

/**
 * Cálculos da tela de Métricas, separados do componente para poderem ser
 * testados com dados reais fora do navegador.
 */

export interface RankingItem {
    id: string;
    name: string;
    total: number;
    totalRecebido: number;
    'Realizado': number;
    'Cancelado': number;
    'Esquecimento': number;
    'No-show': number;
    'Reagendado': number;
    'Pendente': number;
    originalRank?: number;
}

export interface MetricsUser {
    id?: string;
    email?: string;
    role?: string;
    sector?: string;
}

/**
 * Setores cujo trabalho é marcar reunião para OUTRO setor (Closer). Neles a
 * pessoa conta no ranking como responsável (owner; nasce igual ao criador) dos
 * agendamentos de tipo Closer, além de contar como atendente.
 */
export const RESPONSIBLE_SECTORS = ['SDR', 'Leads', SECTOR_PRE_VENDAS, 'Aldeia'];

/** Tipos atendidos por Closer, marcados por outra pessoa. */
export const CLOSER_TYPES = ['Ligação Closer', 'Gold Call', 'Reagendamento Closer', 'Upgrade', 'Fora da agenda', 'Fechamento', 'Direcionar Closer'];

/**
 * Direção do agendamento em relação à equipe (setor exibido):
 *  - out:      feito pela equipe para outro setor (responsável na equipe, atendente fora)
 *  - internal: da equipe para a própria equipe   (responsável e atendente na equipe)
 *  - in:       de outro setor para a equipe      (responsável fora, atendente na equipe)
 */
export type DirectionFilter = 'all' | 'out' | 'internal' | 'in';

/** Responsável = owner; agendamentos sem owner valem pelo criador. */
export const responsibleOf = (a: Appointment) => a.ownerId ?? a.createdBy;

export interface MetricsInput {
    user: MetricsUser | null | undefined;
    appointments: Appointment[];
    attendants: Attendant[];
    startDate: string;
    endDate: string;
    attendantFilter: string;
    eventFilter: string;
    typeFilter: string;
    sectorFilter: string;
    directionFilter?: DirectionFilter;
    uniqueClients: boolean;
    selectedStatuses: string[];
}

/**
 * Etapa 1 das Métricas: período, evento, tipo e setor (visibilidade + filtro de
 * setor). Também usada, sem tipo e evento, para montar as opções desses filtros.
 */
export const filterAppointments = ({
    user, appointments, attendants, startDate, endDate, eventFilter, typeFilter, sectorFilter, directionFilter = 'all'
}: Pick<MetricsInput, 'user' | 'appointments' | 'attendants' | 'startDate' | 'endDate' | 'eventFilter' | 'typeFilter' | 'sectorFilter' | 'directionFilter'>): Appointment[] => {
    const allowedSectors = getAllowedSectors(user);
    const isGlobalViewer = canViewAllSectors(user);
    const sectorById = new Map(attendants.map(att => [att.id, att.sector]));
    const sectorOf = (id?: string) => (id ? sectorById.get(id) : undefined);

    // Equipe do filtro de setor ('SDR' inclui 'Leads').
    const inTeam = (sector?: string) => !!sector && (sectorFilter === 'SDR'
        ? (sector === 'SDR' || sector === 'Leads')
        : sector === sectorFilter);

    // 1. Filter Appointments by Date, Event, Type
    return appointments.filter(a => {
        if (!a.date) return false;

        // Period Filter
        if (startDate && endDate) {
            if (a.date < startDate || a.date > endDate) return false;
        } else {
            return false;
        }

        // Event Filter
        if (eventFilter && a.eventId !== eventFilter) return false;

        // Type Filter
        if (typeFilter && a.type !== typeFilter) return false;

        const responsibleSector = sectorOf(responsibleOf(a));
        const creatorSector = sectorOf(a.createdBy);
        const attendantSector = sectorOf(a.attendantId);

        // Visibilidade: algum envolvido é de um setor que o usuário pode ver.
        if (!isGlobalViewer) {
            const visible = [creatorSector, responsibleSector, attendantSector]
                .some(sec => !!sec && allowedSectors.includes(sec));
            if (!visible) return false;
        }

        // Setor: o agendamento envolve a equipe como responsável OU como atendente.
        if (sectorFilter !== 'all') {
            const byTeam = inTeam(responsibleSector);
            const toTeam = inTeam(attendantSector);
            if (!byTeam && !toTeam) return false;

            if (directionFilter === 'out' && !(byTeam && !toTeam)) return false;
            if (directionFilter === 'internal' && !(byTeam && toTeam)) return false;
            if (directionFilter === 'in' && !(!byTeam && toTeam)) return false;
        }

        return true;
    });
};

export const computeMetrics = ({
    user, appointments, attendants, startDate, endDate, attendantFilter,
    eventFilter, typeFilter, sectorFilter, directionFilter = 'all', uniqueClients, selectedStatuses
}: MetricsInput) => {
    let filtered = filterAppointments({ user, appointments, attendants, startDate, endDate, eventFilter, typeFilter, sectorFilter, directionFilter });

    // 1.5 Alunos únicos: cada aluno (telefone) conta uma única vez, pelo agendamento
    // mais recente dentro dos filtros atuais. Aplicado antes de rankings, gráfico,
    // totais e exportação, para a tela inteira usar a mesma base.
    if (uniqueClients) {
        const uniqueMap = new Map<string, typeof filtered[0]>();
        filtered.forEach(appt => {
            const key = appt.phone ? appt.phone.toString() : appt.id;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, appt);
            } else {
                const existing = uniqueMap.get(key)!;
                const d1 = new Date(`${appt.date}T${appt.time}`);
                const d2 = new Date(`${existing.date}T${existing.time}`);

                if (d1 > d2) {
                    uniqueMap.set(key, appt);
                }
            }
        });
        filtered = Array.from(uniqueMap.values());
    }

    // 2. Generate Rankings for ALL sectors
    const rankingsMap = new Map<string, RankingItem[]>();
    const sectors = ['SDR', 'Leads', 'Closer', 'Aldeia', 'Tribo', 'Social Seller', SECTOR_PRE_VENDAS, 'Suporte', 'TEI', 'Qualidade'];

    sectors.forEach(sector => {
        const map = new Map<string, RankingItem>();
        
        filtered.forEach(a => {
            // Setores que marcam para o Closer: contam como RESPONSÁVEL (owner) nos
            // tipos de Closer. Se o atendente for da mesma equipe (ex.: Aldeia em
            // Reagendamento Closer), ele já conta como atendente logo abaixo.
            const responsibleId = responsibleOf(a);
            if (RESPONSIBLE_SECTORS.includes(sector) && responsibleId && CLOSER_TYPES.includes(a.type)) {
                const responsible = attendants.find(att => att.id === responsibleId);
                const attendantSector = attendants.find(att => att.id === a.attendantId)?.sector;
                if (responsible && responsible.sector === sector && attendantSector !== sector) {
                    if (!map.has(responsibleId)) {
                        map.set(responsibleId, {
                            id: responsible.id,
                            name: responsible.name,
                            total: 0,
                            totalRecebido: 0,
                            'Realizado': 0,
                            'Cancelado': 0,
                            'Esquecimento': 0,
                            'No-show': 0,
                            'Reagendado': 0,
                            'Pendente': 0
                        });
                    }
                    const stats = map.get(responsibleId)!;
                    stats.total++;
                    if (a.status as string in stats) {
                        stats[a.status]++;
                    }
                }
            }

            // For ALL sectors: calculate as attendant (totalRecebido and status)
            if (a.attendantId) {
                const attendant = attendants.find(att => att.id === a.attendantId);
                if (attendant && attendant.sector === sector) {
                    if (!map.has(a.attendantId)) {
                        map.set(a.attendantId, {
                            id: attendant.id,
                            name: attendant.name,
                            total: 0,
                            totalRecebido: 0,
                            'Realizado': 0,
                            'Cancelado': 0,
                            'Esquecimento': 0,
                            'No-show': 0,
                            'Reagendado': 0,
                            'Pendente': 0
                        });
                    }
                    const stats = map.get(a.attendantId)!;
                    stats.total++;
                    if (a.attendantId !== a.createdBy) {
                        stats.totalRecebido++;
                    }
                    if (a.status as string in stats) {
                        stats[a.status]++;
                    }
                }
            }
        });

        // Sort by Realizados
        const ranking = Array.from(map.values())
            .sort((a, b) => b['Realizado'] - a['Realizado'])
            .map((item, idx) => ({ ...item, originalRank: idx })) as RankingItem[];

        // Apply attendant filter
        const filteredRanking = attendantFilter 
            ? ranking.filter(item => item.id === attendantFilter)
            : ranking;

        rankingsMap.set(sector, filteredRanking);
    });

    // 3. Chart Data
    type ChartItem = {
        displayDate: string;
        rawDate: number;
        total: number;
        'Cancelado': number;
        'Esquecimento': number;
        'No-show': number;
        'Pendente': number;
        'Realizado': number;
        'Reagendado': number;
    };
    const dateMap = new Map<string, ChartItem>();

    // Datas montadas no horário LOCAL. `new Date('YYYY-MM-DD')` é meia-noite UTC,
    // que no Brasil cai no dia anterior: o gráfico começava um dia antes e
    // perdia o último dia do período.
    const loop = new Date(`${startDate}T12:00:00`);
    const endLoop = new Date(`${endDate}T23:59:59.999`);
    const pad = (n: number) => String(n).padStart(2, '0');

    let count = 0;
    while (loop <= endLoop && count < 366) {
        const dateStr = `${loop.getFullYear()}-${pad(loop.getMonth() + 1)}-${pad(loop.getDate())}`;
        const display = loop.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        dateMap.set(dateStr, {
            displayDate: display,
            rawDate: loop.getTime(),
            total: 0,
            'Cancelado': 0,
            'Esquecimento': 0,
            'No-show': 0,
            'Pendente': 0,
            'Realizado': 0,
            'Reagendado': 0
        });
        loop.setDate(loop.getDate() + 1);
        count++;
    }

    filtered.forEach(a => {
        const key = a.date;
        if (dateMap.has(key)) {
            const stats = dateMap.get(key)!;
            if (a.status as string in stats) {
                stats[a.status as AppointmentStatus]++;
            }
        }
    });

    const sortedData = Array.from(dateMap.values()).sort((a, b) => a.rawDate - b.rawDate);
    
    // Recalculate total based on selected statuses
    const chartData = sortedData.map(item => {
        let total = 0;
        selectedStatuses.forEach(status => {
            if (status in item) {
                total += (item as any)[status];
            }
        });
        return { ...item, total };
    });

    // Calculate Totals
    const totals: Record<string, number> = {};
    APPOINTMENT_STATUSES.forEach(status => totals[status] = 0);
    chartData.forEach(item => {
        APPOINTMENT_STATUSES.forEach(status => {
            if (status in item) {
                totals[status] += (item as any)[status];
            }
        });
    });

    const chartTotal = chartData.reduce((acc, curr) => acc + curr.total, 0);

    const sortedFiltered = [...filtered].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
    });

    return { rankings: rankingsMap, chartData, filteredAppointments: sortedFiltered, chartTotal };
};

export interface OwnerStatsItem {
    id: string;
    name: string;
    comoOwner: number;
    realizados: number;
    assumidos: number;
    repassados: number;
}

/**
 * Owner x criador por pessoa do setor exibido. Usa período, evento e tipo, mas
 * não o filtro de setor por atendente: o agendamento de um Pré-vendas quase
 * sempre tem um Closer como atendente. Conta por agendamento (comissão), sem
 * o switch de alunos únicos. null = setor sem troca de owner habilitada.
 */
export const computeOwnerStats = ({
    ownerSectors, ownerDisplaySector, appointments, attendants, startDate, endDate,
    eventFilter, typeFilter, attendantFilter, searchTerm
}: {
    ownerSectors: string[];
    ownerDisplaySector: string;
    appointments: Appointment[];
    attendants: Attendant[];
    startDate: string;
    endDate: string;
    eventFilter: string;
    typeFilter: string;
    attendantFilter: string;
    searchTerm: string;
}): OwnerStatsItem[] | null => {
    if (!ownerSectors.includes(ownerDisplaySector)) return null;
    const sectorOf = (id?: string) => normalizeSector(attendants.find(att => att.id === id)?.sector);
    const stats = new Map<string, OwnerStatsItem>();
    const get = (id: string) => {
        if (!stats.has(id)) {
            stats.set(id, { id, name: attendants.find(att => att.id === id)?.name || '-', comoOwner: 0, realizados: 0, assumidos: 0, repassados: 0 });
        }
        return stats.get(id)!;
    };

    appointments.forEach(a => {
        if (!a.date || !startDate || !endDate || a.date < startDate || a.date > endDate) return;
        if (eventFilter && a.eventId !== eventFilter) return;
        if (typeFilter && a.type !== typeFilter) return;

        const ownerId = a.ownerId ?? a.createdBy;
        if (ownerId && sectorOf(ownerId) === ownerDisplaySector) {
            const s = get(ownerId);
            s.comoOwner++;
            if (a.status === 'Realizado') s.realizados++;
            if (a.createdBy && a.createdBy !== ownerId) s.assumidos++;
        }
        if (a.createdBy && ownerId && a.createdBy !== ownerId && sectorOf(a.createdBy) === ownerDisplaySector) {
            get(a.createdBy).repassados++;
        }
    });

    return Array.from(stats.values())
        .filter(s => !attendantFilter || s.id === attendantFilter)
        .filter(s => !searchTerm.trim() || s.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => b.realizados - a.realizados || b.comoOwner - a.comoOwner);
};

/**
 * Exportação = agendamentos da tela com TODOS os filtros da página: período,
 * setor, tipo, evento e alunos únicos (já em filteredAppointments), mais
 * atendente, pesquisa por nome e os status marcados no gráfico. Atendente e
 * pesquisa valem para quem é atendente, criador ou owner do agendamento.
 */
export const filterForExport = ({
    filteredAppointments, attendants, attendantFilter, searchTerm, selectedStatuses
}: {
    filteredAppointments: Appointment[];
    attendants: Attendant[];
    attendantFilter: string;
    searchTerm: string;
    selectedStatuses: string[];
}): Appointment[] => {
    const nameOf = (id?: string) => attendants.find(att => att.id === id)?.name?.toLowerCase() || '';
    const term = searchTerm.trim().toLowerCase();
    return filteredAppointments.filter(a => {
        const people = [a.attendantId, a.createdBy, a.ownerId ?? a.createdBy];
        if (attendantFilter && !people.includes(attendantFilter)) return false;
        if (term && !people.some(id => nameOf(id).includes(term))) return false;
        if (!selectedStatuses.includes(a.status)) return false;
        return true;
    });
};
