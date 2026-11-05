import React, { useState, useMemo, useEffect } from 'react';
import { staggerStyle } from '../lib/motion';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { useFormData } from '../hooks/useFormData';
import { Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { FadeIn, CountUp } from '../components/ui/animate';
import { FloatingSelect } from '../components/FloatingSelect';
import { FloatingDateInput } from '../components/FloatingDateInput';
import { Input as BaseInput } from '../components/ui/input';
import { ExportIcon } from '../components/ExportIcon';
import { canViewAllSectors, isMedinaUser, getAllowedSectors, escapeCsvValue } from '../utils/security';
import {
    ComposedChart,
    Bar,
    XAxis,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Line,
    LabelList
} from 'recharts';
import { cn } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { STATUS_COLORS, STATUS_TOTAL_CHART } from '../lib/appointmentStatus';
import type { AppointmentStatus } from '../types';
import { RankingModal } from '../components/RankingModal';
import { computeMetrics, computeOwnerStats, filterAppointments, filterForExport, responsibleOf, RESPONSIBLE_SECTORS, type DirectionFilter, type RankingScope } from '../utils/metricsCalc';
import { FloatingMultiSelect } from '../components/FloatingMultiSelect';
import { api } from '../services/api';
import { isCustomerSuccess, isPreVendas, normalizeSector } from '../constants/sectors';
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider
} from '../components/ui/tooltip';


// Ordem dos status no gráfico e nos filtros; as cores vêm de STATUS_COLORS.
const CHART_STATUSES: AppointmentStatus[] = ['Realizado', 'Pendente', 'Cancelado', 'Reagendado', 'Esquecimento', 'No-show'];

// Selo de posição do pódio (1º/2º/3º) no lugar da borda colorida.
const PODIUM_BADGE = [
    'bg-status-iniciando/15 text-status-iniciando',
    'bg-status-pendente/15 text-status-pendente',
    'bg-status-noshow/15 text-status-noshow',
];

export const Metrics: React.FC = () => {
    const { appointments: loadedAppointments, refresh, loading: loadingAppointments, truncated } = useAppointments();
    const { attendants, events } = useFormData();

    // Filters State
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const toLocalISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const [startDate, setStartDate] = useState(toLocalISO(firstDay));
    const [endDate, setEndDate] = useState(toLocalISO(lastDay));

    const [attendantFilter, setAttendantFilter] = useState('');
    const [eventFilter, setEventFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState<string[]>([]);
    const [uniqueClients, setUniqueClients] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
    // Ranking dos setores que marcam para outros (Pré-vendas etc.): outros setores x próprio setor.
    const [rankingScope, setRankingScope] = useState<Exclude<RankingScope, 'all'>>('other');

    // --- UI STATE ---
    const { user } = useAuth();
    const isPrivilegedUser = canViewAllSectors(user) || user?.role === 'Admin' || user?.role === 'Dev';
    // Colaborador vê só os próprios números (como atendente ou responsável), sem ranking.
    const isCollaborator = user?.role === 'Colaborador';
    const [sectorFilterState, setSectorFilter] = useState(() => {
        if (isPrivilegedUser) return 'all';
        return user?.sector || 'all';
    });
    const sectorFilter = isCollaborator ? 'all' : sectorFilterState;

    const appointments = useMemo(() => isCollaborator && user
        ? loadedAppointments.filter(a => a.attendantId === user.id || responsibleOf(a) === user.id)
        : loadedAppointments, [isCollaborator, user, loadedAppointments]);

    // Reset attendant filter when sector changes
    React.useEffect(() => {
        if (sectorFilter === 'all' || !attendantFilter) return;
        const currentAtt = attendants.find(a => a.id === attendantFilter);
        if (currentAtt) {
            const isMatch = sectorFilter === 'SDR'
                ? (currentAtt.sector === 'SDR' || currentAtt.sector === 'Leads')
                : currentAtt.sector === sectorFilter;
            if (!isMatch) setAttendantFilter('');
        }
    }, [sectorFilter, attendantFilter, attendants]);

    const [rankingModal, setRankingModal] = useState<{
        isOpen: boolean;
        type: string;
        title: string;
        data: any[];
        showTotal?: boolean;
    }>({
        isOpen: false,
        type: 'general',
        title: '',
        data: []
    });

    // Status toggle state for chart
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
        'Realizado', 'Pendente', 'Cancelado', 'Reagendado', 'Esquecimento', 'No-show'
    ]);

    const toggleStatus = (status: string) => {
        setSelectedStatuses(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    // A direção (equipe -> outros, equipe -> equipe, outros -> equipe) só faz
    // sentido com uma equipe escolhida no filtro de setor.
    const effectiveDirection: DirectionFilter = sectorFilter === 'all' ? 'all' : directionFilter;

    // O switch só existe no ranking dos setores que marcam para outros.
    const rankingDisplaySector = sectorFilter === 'all' && user?.sector ? normalizeSector(user.sector) : sectorFilter;
    const hasScopeSwitch = RESPONSIBLE_SECTORS.includes(rankingDisplaySector);
    const rankingScopeFor = (_sector: string): RankingScope => hasScopeSwitch ? rankingScope : 'all';

    // --- DATA CALCULATION ---
    const { rankings, chartData, filteredAppointments, chartTotal } = useMemo(() => computeMetrics({
        user, appointments, attendants, startDate, endDate, attendantFilter,
        eventFilter, typeFilter, sectorFilter, directionFilter: effectiveDirection, rankingScope: rankingScopeFor(sectorFilter), uniqueClients, selectedStatuses
    }), [user, appointments, startDate, endDate, attendantFilter, eventFilter, typeFilter, attendants, sectorFilter, effectiveDirection, rankingScope, uniqueClients, selectedStatuses]);

    // Busca no banco tudo do período selecionado. Sem isso a tela usaria a lista
    // que já estava carregada (carga inicial ou período de outra tela).
    useEffect(() => {
        if (!startDate || !endDate || startDate > endDate) return;
        refresh({ startDate, endDate });
    }, [startDate, endDate]);

    // Setores com troca de responsável habilitada (Configurações). Só neles o card de responsáveis aparece.
    const [ownerSectors, setOwnerSectors] = useState<string[]>([]);
    useEffect(() => {
        api.settings.getOwnerChangeSectors()
            .then(r => setOwnerSectors(r.sectors))
            .catch(() => setOwnerSectors([]));
    }, []);

    const ownerDisplaySector = sectorFilter === 'all' && user?.sector ? normalizeSector(user.sector) : sectorFilter;

    // Base do card: mesmos filtros da página (visibilidade, setor e direção), sem alunos únicos.
    const ownerBase = useMemo(() => filterAppointments({
        user, appointments, attendants, startDate, endDate, eventFilter, typeFilter,
        sectorFilter: ownerDisplaySector || 'all', directionFilter: ownerDisplaySector ? directionFilter : 'all'
    }), [user, appointments, attendants, startDate, endDate, eventFilter, typeFilter, ownerDisplaySector, directionFilter]);

    const ownerStats = useMemo(() => computeOwnerStats({
        ownerSectors, ownerDisplaySector, appointments: ownerBase, attendants, startDate, endDate,
        eventFilter, typeFilter, attendantFilter, searchTerm
    }), [ownerSectors, ownerDisplaySector, ownerBase, attendants, startDate, endDate, eventFilter, typeFilter, attendantFilter, searchTerm]);

    const exportAppointments = useMemo(() => filterForExport({
        filteredAppointments, attendants, attendantFilter, searchTerm, selectedStatuses
    }), [filteredAppointments, attendants, attendantFilter, searchTerm, selectedStatuses]);

    const handleExport = () => {
        if (loadingAppointments) return;
        if (!exportAppointments.length) return;
        const headers = ['Data', 'Horario', 'Lead', 'Telefone', 'Email', 'Tipo', 'Status', 'Atendente', 'Criador', 'Responsável', 'Evento'];
        const csvRows = exportAppointments.map((appt: any) => {
            const attendant = attendants.find(att => att.id === appt.attendantId);
            const event = events.find(e => e.id === appt.eventId);
            const creator = attendants.find(att => att.id === appt.createdBy);
            const owner = attendants.find(att => att.id === (appt.ownerId ?? appt.createdBy));
            return [
                escapeCsvValue(appt.date),
                escapeCsvValue(appt.time),
                escapeCsvValue(appt.lead),
                escapeCsvValue(appt.phone),
                escapeCsvValue(appt.email),
                escapeCsvValue(appt.type),
                escapeCsvValue(appt.status),
                escapeCsvValue(attendant?.name),
                escapeCsvValue(creator?.name),
                escapeCsvValue(owner?.name),
                escapeCsvValue(event?.event_name)
            ].join(',');
        });
        const csvString = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.body.appendChild(document.createElement('a'));
        link.href = URL.createObjectURL(blob);
        link.download = `metricas_${startDate}_ate_${endDate}.csv`;
        link.click();
        document.body.removeChild(link);
    };

    // Agendamentos do período visíveis com o setor atual, ignorando tipo e evento:
    // base para as opções desses dois filtros. Sem isso, tipos e eventos de
    // outro setor (ex.: evento do Pré-vendas atendido pelo Closer) não podiam
    // ser filtrados, embora entrassem nos números.
    const optionBase = useMemo(() => filterAppointments({
        user, appointments, attendants, startDate, endDate, eventFilter: '', typeFilter: [], sectorFilter, directionFilter: effectiveDirection
    }), [user, appointments, attendants, startDate, endDate, sectorFilter, effectiveDirection]);

    // Quem vê vários setores (Admin, Dev, Suporte, Qualidade...) escolhe entre os
    // eventos do setor filtrado e os que aparecem nos dados. Os demais (Líder,
    // Co-líder, Colaborador) só veem os eventos do próprio time.
    const seesAllEvents = isPrivilegedUser || user?.role === 'Qualidade' || isMedinaUser(user);
    const eventOptions = useMemo(() => {
        const mySector = normalizeSector(user?.sector);
        const presentIds = new Set(optionBase.map(a => a.eventId).filter(Boolean));
        return events
            .filter(e => e.id === eventFilter || (seesAllEvents
                ? (sectorFilter === 'all' || !e.sector || e.sector === sectorFilter || presentIds.has(e.id))
                : normalizeSector(e.sector) === mySector))
            .map(e => ({ value: e.id, label: e.event_name }));
    }, [events, optionBase, sectorFilter, eventFilter, seesAllEvents, user]);

    // Get allowed types for current sector
    const getAllowedTypesForSector = () => {
        const displaySector = sectorFilter === 'all' && user?.sector ? user.sector : sectorFilter;
        // "Ligação Equipe Aldeia" está oculto (sem uso desde jul/26); se aparecer nos dados do período, entra pela lista abaixo.
        const allTypes = ['Ligação SDR', 'Ligação Closer', 'Agendamento Pessoal', 'Reagendamento Closer', 'Upgrade', 'Fora da agenda', 'Gold Call', 'Onboarding', 'Fechamento', 'Direcionar Closer'];
        
        if (displaySector === 'all' || !displaySector) {
            return allTypes.map(t => ({ value: t, label: t }));
        }

        let allowed: string[] = [];
        
        if (displaySector === 'SDR' || displaySector === 'Leads') {
            allowed = ['Ligação SDR', 'Ligação Closer', 'Reagendamento Closer', 'Upgrade', 'Fora da agenda', 'Gold Call', 'Fechamento'];
        } else if (displaySector === 'Closer') {
            allowed = ['Ligação Closer', 'Agendamento Pessoal', 'Reagendamento Closer', 'Upgrade', 'Fora da agenda', 'Gold Call'];
        } else if (isCustomerSuccess(displaySector)) {
            allowed = ['Agendamento Pessoal', 'Onboarding', 'Reagendamento Closer', 'Ligação Closer'];
        } else if (displaySector === 'Social Seller') {
            allowed = ['Ligação Closer', 'Reagendamento Closer', 'Upgrade', 'Gold Call'];
        } else if (isPreVendas(displaySector)) {
            allowed = ['Gold Call', 'Fechamento', 'Agendamento Pessoal', 'Ligação Closer', 'Reagendamento Closer', 'Direcionar Closer', 'Fora da agenda'];
        } else {
            allowed = [...allTypes];
        }

        // Tipos que aparecem nos dados do período também entram, mesmo fora da lista do setor.
        optionBase.forEach(a => { if (a.type && !allowed.includes(a.type)) allowed.push(a.type); });
        typeFilter.forEach(t => { if (!allowed.includes(t)) allowed.push(t); });

        return allowed.map(t => ({ value: t, label: t }));
    };

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div style={staggerStyle(0, 80)} className="animate-blur-fade flex flex-col gap-4 bg-surface p-4 rounded-xl border border-border">
                <div className="flex flex-wrap items-center gap-4">
                    {/* No celular as datas dividem a linha inteira; a partir de sm voltam à largura fixa */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter size={18} className="text-muted-foreground shrink-0" />
                        <FloatingDateInput
                            label="Data Inicial"
                            value={startDate}
                            onChange={(e: any) => setStartDate(e.target.value)}
                            maxDate={endDate ? new Date(`${endDate}T12:00:00`) : undefined}
                            className="flex-1 min-w-0 sm:flex-none sm:w-36"
                        />
                        <FloatingDateInput
                            label="Data Final"
                            value={endDate}
                            onChange={(e: any) => setEndDate(e.target.value)}
                            minDate={startDate ? new Date(`${startDate}T12:00:00`) : undefined}
                            className="flex-1 min-w-0 sm:flex-none sm:w-36"
                        />
                    </div>

                    {/* Search by Name */}
                    {!isCollaborator && (
                        <div className="w-full sm:w-64">
                            <BaseInput
                                placeholder="Pesquisar por nome"
                                value={searchTerm}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Sector Filter */}
                    {(canViewAllSectors(user) || isMedinaUser(user) || user?.role === 'Admin' || user?.role === 'Dev' || user?.role === 'Qualidade') && (
                        <FloatingSelect
                            label="Setor"
                            value={sectorFilter}
                            onChange={(e: any) => setSectorFilter(e.target.value)}
                            options={[
                                { value: 'all', label: 'Todos os Setores' },
                                ...getAllowedSectors(user).map(s => ({ value: s, label: s }))
                            ]}
                            className="w-full sm:w-40"
                        />
                    )}

                    {/* Direção em relação à equipe */}
                    {sectorFilter !== 'all' && (
                        <FloatingSelect
                            label="Direção"
                            value={directionFilter}
                            onChange={(e: any) => setDirectionFilter(e.target.value as DirectionFilter)}
                            options={[
                                { value: 'all', label: 'Todos' },
                                { value: 'out', label: 'Da equipe para outros setores' },
                                { value: 'internal', label: 'Da equipe para a própria equipe' },
                                { value: 'in', label: 'De outros setores para a equipe' }
                            ]}
                            className="w-full sm:w-64"
                        />
                    )}

                    {/* Type Filter */}
                    <FloatingMultiSelect
                        label="Tipo"
                        values={typeFilter}
                        onChange={setTypeFilter}
                        options={getAllowedTypesForSector()}
                        className="w-full sm:w-48"
                    />

                    {!isCollaborator && <FloatingSelect
                        label="Atendente"
                        value={attendantFilter}
                        onChange={(e: any) => setAttendantFilter(e.target.value)}
                        options={[
                            { value: '', label: 'Todos' },
                            ...attendants
                                .filter(a => {
                                    if (sectorFilter === 'all') return true;
                                    if (sectorFilter === 'SDR') return a.sector === 'SDR' || a.sector === 'Leads';
                                    return a.sector === sectorFilter;
                                })
                                .map(a => ({ value: a.id, label: a.name }))
                        ]}
                        className="w-full sm:w-48"
                    />}

                    <FloatingSelect
                        label="Evento"
                        value={eventFilter}
                        onChange={(e: any) => setEventFilter(e.target.value)}
                        options={[
                            { value: '', label: 'Todos' },
                            ...eventOptions
                        ]}
                        className="w-full sm:w-48"
                    />

                    <button
                        type="button"
                        role="switch"
                        aria-checked={uniqueClients}
                        onClick={() => setUniqueClients(prev => !prev)}
                        title="Conta cada aluno uma única vez no período, pelo agendamento mais recente dele. Vale para rankings, gráfico, totais e exportação."
                        className={cn(
                            "h-11 px-3 flex items-center gap-2 rounded-md border text-sm shadow-sm transition-colors",
                            uniqueClients
                                ? "border-foreground/60 text-foreground"
                                : "border-border text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span
                            className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                                uniqueClients ? "bg-foreground" : "bg-muted-foreground/30"
                            )}
                        >
                            <span
                                className={cn(
                                    "inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
                                    uniqueClients ? "translate-x-4" : "translate-x-0.5"
                                )}
                            />
                        </span>
                        Alunos únicos
                    </button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-auto"
                        onClick={handleExport}
                        disabled={loadingAppointments || !exportAppointments.length}
                        aria-label={loadingAppointments ? "Exportar CSV (carregando agendamentos do período)" : `Exportar CSV com ${exportAppointments.length} agendamentos`}
                        title={loadingAppointments ? "Carregando agendamentos do período..." : `Exportar CSV (${exportAppointments.length} agendamentos com os filtros atuais)`}
                    >
                        <ExportIcon />
                    </Button>
                </div>
            </div>

            {truncated && !loadingAppointments && (
                <div className="p-3 rounded-lg border border-status-noshow/40 bg-status-noshow/10 text-sm text-foreground">
                    O período selecionado tem mais agendamentos do que o limite de carregamento. Os números e a exportação estão incompletos — reduza o período.
                </div>
            )}

            {/* Colaborador: só os próprios números */}
            {isCollaborator && (() => {
                const count = (st: string) => filteredAppointments.filter(a => a.status === st).length;
                const total = filteredAppointments.length;
                const done = count('Realizado');
                const tiles: [string, number][] = [
                    ['Agendamentos', total], ['Realizados', done], ['Pendentes', count('Pendente')],
                    ['No-show', count('No-show')], ['Cancelados', count('Cancelado')], ['Reagendados', count('Reagendado')]
                ];
                return (
                    <div className="bg-surface p-4 sm:p-6 rounded-xl border border-border shadow-sm">
                        <h3 className="text-lg font-bold text-foreground">Meus números</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Agendamentos em que você é o atendente ou o responsável. Taxa de realização: {loadingAppointments ? '…' : `${total ? Math.round(done / total * 100) : 0}%`}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
                            {tiles.map(([label, value], i) => (
                                <FadeIn key={label} index={i} className="rounded-lg bg-background p-3 transition-transform duration-200 hover:-translate-y-0.5">
                                    {loadingAppointments
                                        ? <Skeleton className="h-8 w-12 mb-0.5" />
                                        : <CountUp value={value} className="block text-2xl font-bold text-foreground tabular-nums" />}
                                    <div className="text-xs text-muted-foreground">{label}</div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Rankings */}
            {!isCollaborator && <div className="grid grid-cols-1 gap-6">
                {(() => {
                    let displaySector = sectorFilter;
                    if (displaySector === 'all' && user?.sector) {
                        displaySector = user.sector;
                    }

                    let ranking = rankings.get(displaySector === 'SDR' ? 'SDR' : displaySector) || 
                                   rankings.get(displaySector === 'Leads' ? 'Leads' : displaySector) || 
                                   [];
                    // Filter by search term
                    if (searchTerm.trim()) {
                        ranking = ranking.filter(item => 
                            item.name.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                    }
                    const total = ranking.reduce((acc, curr) => acc + curr.total, 0);

                    const showOtherTotal = hasScopeSwitch && rankingScope === 'other';
                    const scopeSwitch = hasScopeSwitch && (
                        <div className="inline-flex p-1 rounded-lg bg-muted/40 border border-border text-xs font-medium" role="tablist">
                            {([['other', 'Para outros setores'], ['own', 'Próprio setor']] as const).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    role="tab"
                                    aria-selected={rankingScope === value}
                                    onClick={() => setRankingScope(value)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md transition-colors",
                                        rankingScope === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    );

                    // Enquanto carrega: esqueleto no lugar de "Sem dados"/zeros.
                    if (loadingAppointments && displaySector) {
                        return (
                            <div style={staggerStyle(1, 80)} className="animate-fade-up bg-surface p-4 sm:p-6 rounded-xl border border-border shadow-sm" aria-busy="true">
                                <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
                                    <h3 className="text-lg font-bold text-foreground">Agendamentos por {displaySector}</h3>
                                    <Skeleton className="h-7 w-24" />
                                </div>
                                <div className="space-y-2">
                                    {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[52px] w-full rounded-lg" />)}
                                </div>
                                <span className="sr-only">Carregando ranking…</span>
                            </div>
                        );
                    }

                    if (ranking.length === 0 && displaySector) {
                        return (
                            <div style={staggerStyle(1, 80)} className="animate-fade-up bg-surface p-4 sm:p-6 rounded-xl border border-border shadow-sm">
                                <div className="flex flex-wrap justify-between items-start gap-3">
                                    <h3 className="text-lg font-bold text-foreground">Agendamentos por {displaySector}</h3>
                                    {scopeSwitch}
                                </div>
                                <p className="text-muted-foreground text-sm text-center py-8">Nenhum agendamento no período. Ajuste as datas ou os filtros acima.</p>
                            </div>
                        );
                    }

                    return (
                        <div style={staggerStyle(2, 80)} className="animate-fade-up bg-surface p-4 sm:p-6 rounded-xl border border-border shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                                <div className="min-w-0">
                                    <h3 className="text-lg font-bold text-foreground">Agendamentos por {displaySector}</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {hasScopeSwitch
                                            ? (rankingScope === 'other'
                                                ? 'Agendamentos marcados como responsável para outros setores (ex.: Closer)'
                                                : 'Agendamentos atendidos pela própria equipe')
                                            : 'Total de agendamentos recebidos e realizados'}
                                    </p>
                                    {scopeSwitch && <div className="mt-3">{scopeSwitch}</div>}
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                                    <span className="text-lg font-bold text-foreground">Total: {total}</span>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setRankingModal({
                                            isOpen: true,
                                            type: displaySector,
                                            title: `Ranking ${displaySector} Completo`,
                                            data: ranking,
                                            showTotal: showOtherTotal
                                        })}
                                    >
                                        Expandir
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 text-xs font-semibold text-muted-foreground mb-3 px-3 uppercase">
                                    <div className="col-span-6">Nome</div>
                                    <div className="col-span-3 text-center text-status-realizado">Realizados</div>
                                    <div className="col-span-3 text-center">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <span className="cursor-help">{showOtherTotal ? 'AGENDAMENTOS' : 'TOTAL RECEBIDO'}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="text-xs">{showOtherTotal
                                                        ? 'Agendamentos marcados como responsável para outros setores'
                                                        : 'Considera somente agendamentos onde a pessoa é o Atendente, mas não é o Criador'}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>

                            <div className="space-y-2">
                                {ranking.slice(0, 5).map((item, idx) => {
                                    const podium = PODIUM_BADGE[item.originalRank as number];

                                    return (
                                        <div key={idx} className="grid grid-cols-12 items-center p-3 rounded-lg bg-background transition-colors min-h-[52px]">
                                            {/* No celular o nome quebra linha em vez de ser cortado */}
                                            <div className="col-span-6 flex items-center gap-2 font-medium text-foreground text-sm min-w-0" title={item.name}>
                                                {podium && (
                                                    <span className={cn('shrink-0 inline-flex items-center justify-center min-w-7 h-5 px-1.5 rounded-full text-xs font-bold tabular-nums', podium)}>
                                                        {(item.originalRank as number) + 1}º
                                                    </span>
                                                )}
                                                <span className="min-w-0 break-words sm:truncate">{item.name}</span>
                                            </div>
                                            <div className="col-span-3 text-center font-bold text-status-realizado text-xs">
                                                {item['Realizado']}
                                            </div>
                                            <div className="col-span-3 text-center font-bold text-foreground text-xs">
                                                {showOtherTotal ? item.total : item.totalRecebido}
                                            </div>
                                        </div>
                                    );
                                })}
                                {ranking.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Sem dados para o período</p>}
                            </div>
                        </div>
                    );
                })()}
            </div>}

            {/* Responsáveis (comissão) x criadores */}
            {ownerStats && !isCollaborator && (
                <div style={staggerStyle(3, 80)} className="animate-fade-up bg-surface p-4 sm:p-6 rounded-xl border border-border mt-6 shadow-sm">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-foreground">Responsáveis — {ownerDisplaySector}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            O responsável recebe a comissão. "Repassou" conta os agendamentos que a pessoa criou e o Líder passou para outro responsável. Conta todos os agendamentos, mesmo com o switch de alunos únicos ligado.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="min-w-[520px]">
                            <div className="grid grid-cols-12 text-xs font-semibold text-muted-foreground mb-3 px-3 uppercase">
                                <div className="col-span-4">Nome</div>
                                <div className="col-span-2 text-center">Como responsável</div>
                                <div className="col-span-2 text-center text-status-realizado">Realizados</div>
                                <div className="col-span-2 text-center">Assumiu</div>
                                <div className="col-span-2 text-center text-status-noshow">Repassou</div>
                            </div>
                            <div className="space-y-2">
                                {loadingAppointments && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}
                                {!loadingAppointments && ownerStats.map(item => (
                                    <div key={item.id} className="grid grid-cols-12 items-center p-3 rounded-lg bg-background min-h-[44px]">
                                        <div className="col-span-4 font-medium text-foreground text-sm truncate" title={item.name}>{item.name}</div>
                                        <div className="col-span-2 text-center font-bold text-foreground text-xs">{item.comoOwner}</div>
                                        <div className="col-span-2 text-center font-bold text-status-realizado text-xs">{item.realizados}</div>
                                        <div className="col-span-2 text-center font-bold text-foreground text-xs">{item.assumidos}</div>
                                        <div className="col-span-2 text-center font-bold text-status-noshow text-xs">{item.repassados}</div>
                                    </div>
                                ))}
                                {!loadingAppointments && ownerStats.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Nenhum agendamento com responsável no período.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chart */}
            <div style={staggerStyle(4, 80)} className="animate-fade-up bg-surface p-4 sm:p-6 rounded-xl border border-border mt-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                    <h3 className="text-lg font-bold text-foreground">
                        Agendamentos por Dia
                    </h3>
                    {loadingAppointments
                        ? <Skeleton className="h-7 w-24" />
                        : <span className="text-lg font-bold text-foreground">Total: {chartTotal}</span>}
                </div>

                {loadingAppointments ? (
                    <div className="h-64 sm:h-80 w-full mt-4 flex items-end gap-2 sm:gap-3" aria-busy="true">
                        {[45, 70, 30, 85, 55, 65, 40, 75, 50, 60, 35, 80].map((h, i) => (
                            <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
                        ))}
                        <span className="sr-only">Carregando gráfico…</span>
                    </div>
                ) : (
                <div className="h-64 sm:h-80 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                            <XAxis
                                dataKey="displayDate"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 12 }}
                                dy={10}
                            />
                            <RechartsTooltip
                                cursor={{ fill: 'rgb(var(--muted))', opacity: 0.2 }}
                                content={({ active, payload, label }: any) => {
                                    if (!active || !payload) return null;
                                    return (
                                        <div className="bg-surface border border-border p-3 rounded-lg shadow-xl !opacity-100 min-w-[150px]">
                                            <p className="text-foreground font-bold mb-2 border-b border-border pb-1">{label}</p>
                                            <div className="space-y-1">
                                                {payload.map((item: any) => {
                                                    if (item.dataKey === 'total') return null;
                                                    return (
                                                        <div key={item.dataKey} className="flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-2 h-2 rounded-full"
                                                                    style={{ backgroundColor: item.color }}
                                                                />
                                                                <span className="text-xs text-foreground">{item.name}</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-foreground">{item.value}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                            {CHART_STATUSES.map((status) => (
                                selectedStatuses.includes(status) && (
                                    <Bar
                                        key={status}
                                        dataKey={status}
                                        stackId="a"
                                        fill={STATUS_COLORS[status].chart}
                                        radius={[0, 0, 0, 0]}
                                        barSize={32}
                                    />
                                )
                            ))}
                            <Line type="monotone" dataKey="total" stroke={STATUS_TOTAL_CHART} strokeWidth={2} dot={{ fill: STATUS_TOTAL_CHART, r: 4 }}>
                                <LabelList dataKey="total" position="top" fill={STATUS_TOTAL_CHART} fontSize={12} />
                            </Line>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                )}

                {/* Filtro de status: fundo neutro com ponto na cor da barra (mesma fonte: STATUS_COLORS) */}
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mt-4">
                    {CHART_STATUSES.map((status) => {
                        const active = selectedStatuses.includes(status);
                        return (
                            <button
                                key={status}
                                type="button"
                                aria-pressed={active}
                                onClick={() => toggleStatus(status)}
                                className={cn(
                                    "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-[background-color,border-color,color,opacity] duration-150",
                                    active
                                        ? "bg-background text-foreground border-border"
                                        : "bg-transparent text-muted-foreground border-dashed border-border opacity-70 hover:opacity-100 hover:bg-muted"
                                )}
                            >
                                <span className={cn("size-2.5 rounded-full", active ? STATUS_COLORS[status].dot : "bg-muted-foreground/40")} />
                                {status}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Ranking Modal */}
            <RankingModal
                isOpen={rankingModal.isOpen}
                onClose={() => setRankingModal({ ...rankingModal, isOpen: false })}
                title={rankingModal.title}
                data={rankingModal.data}
                type={rankingModal.type}
                showTotal={rankingModal.showTotal}
            />
        </div>
    );
};
