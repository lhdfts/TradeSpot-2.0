import React, { useState, useMemo, useEffect } from 'react';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { useFormData } from '../hooks/useFormData';
import { Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
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
import { RankingModal } from '../components/RankingModal';
import { computeMetrics, computeOwnerStats, filterAppointments, filterForExport, responsibleOf, RESPONSIBLE_SECTORS, type DirectionFilter, type RankingScope } from '../utils/metricsCalc';
import { FloatingMultiSelect } from '../components/FloatingMultiSelect';
import { api } from '../services/api';
import { isPreVendas, normalizeSector } from '../constants/sectors';
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider
} from '../components/ui/tooltip';


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
        const allTypes = ['Ligação SDR', 'Ligação Closer', 'Ligação Equipe Aldeia', 'Agendamento Pessoal', 'Reagendamento Closer', 'Upgrade', 'Fora da agenda', 'Gold Call', 'Onboarding', 'Fechamento', 'Direcionar Closer'];
        
        if (displaySector === 'all' || !displaySector) {
            return allTypes.map(t => ({ value: t, label: t }));
        }

        let allowed: string[] = [];
        
        if (displaySector === 'SDR' || displaySector === 'Leads') {
            allowed = ['Ligação SDR', 'Ligação Closer', 'Reagendamento Closer', 'Upgrade', 'Fora da agenda', 'Gold Call', 'Fechamento'];
        } else if (displaySector === 'Closer') {
            allowed = ['Ligação Closer', 'Ligação Equipe Aldeia', 'Agendamento Pessoal', 'Reagendamento Closer', 'Upgrade', 'Fora da agenda', 'Gold Call'];
        } else if (displaySector === 'Tribo') {
            allowed = ['Agendamento Pessoal', 'Onboarding'];
        } else if (displaySector === 'Aldeia') {
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
            <div className="flex flex-col gap-4 bg-surface p-4 rounded-xl border border-border">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-secondary" />
                        <FloatingDateInput
                            label="Data Inicial"
                            value={startDate}
                            onChange={(e: any) => setStartDate(e.target.value)}
                            maxDate={endDate ? new Date(`${endDate}T12:00:00`) : undefined}
                            className="w-36"
                        />
                        <FloatingDateInput
                            label="Data Final"
                            value={endDate}
                            onChange={(e: any) => setEndDate(e.target.value)}
                            minDate={startDate ? new Date(`${startDate}T12:00:00`) : undefined}
                            className="w-36"
                        />
                    </div>

                    {/* Search by Name */}
                    {!isCollaborator && (
                        <div className="w-64">
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
                            className="w-40"
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
                            className="w-64"
                        />
                    )}

                    {/* Type Filter */}
                    <FloatingMultiSelect
                        label="Tipo"
                        values={typeFilter}
                        onChange={setTypeFilter}
                        options={getAllowedTypesForSector()}
                        className="w-48"
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
                        className="w-48"
                    />}

                    <FloatingSelect
                        label="Evento"
                        value={eventFilter}
                        onChange={(e: any) => setEventFilter(e.target.value)}
                        options={[
                            { value: '', label: 'Todos' },
                            ...eventOptions
                        ]}
                        className="w-48"
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
                                ? "border-[#070707] dark:border-gray-400 text-foreground"
                                : "border-border text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span
                            className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                                uniqueClients ? "bg-[#070707] dark:bg-white" : "bg-gray-300 dark:bg-gray-600"
                            )}
                        >
                            <span
                                className={cn(
                                    "inline-block h-4 w-4 rounded-full bg-white dark:bg-[#070707] shadow transition-transform",
                                    uniqueClients ? "translate-x-4" : "translate-x-0.5"
                                )}
                            />
                        </span>
                        Alunos únicos
                    </button>
                    <div
                        className={cn(
                            "ml-auto transition-colors p-2",
                            loadingAppointments ? "opacity-40 cursor-wait" : "cursor-pointer hover:text-blue-500"
                        )}
                        onClick={handleExport}
                        title={loadingAppointments ? "Carregando agendamentos do período..." : `Exportar CSV (${exportAppointments.length} agendamentos com os filtros atuais)`}
                    >
                        <ExportIcon />
                    </div>
                </div>
            </div>

            {truncated && !loadingAppointments && (
                <div className="p-3 rounded-lg border border-[#FF9100]/40 bg-[#FF9100]/10 text-sm text-foreground">
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
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                        <h3 className="text-lg font-bold text-foreground">Meus números</h3>
                        <p className="text-xs text-secondary mt-1">
                            Agendamentos em que você é o atendente ou o responsável. Taxa de realização: {total ? Math.round(done / total * 100) : 0}%
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
                            {tiles.map(([label, value]) => (
                                <div key={label} className="rounded-lg bg-background p-3">
                                    <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
                                    <div className="text-xs text-secondary">{label}</div>
                                </div>
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

                    if (ranking.length === 0 && displaySector) {
                        return (
                            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                                <div className="flex flex-wrap justify-between items-start gap-3">
                                    <h3 className="text-lg font-bold text-foreground">Agendamentos por {displaySector}</h3>
                                    {scopeSwitch}
                                </div>
                                <p className="text-secondary text-sm text-center py-8">Sem dados para o período</p>
                            </div>
                        );
                    }

                    return (
                        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Agendamentos por {displaySector}</h3>
                                    <p className="text-xs text-secondary mt-1">
                                        {hasScopeSwitch
                                            ? (rankingScope === 'other'
                                                ? 'Agendamentos marcados como responsável para outros setores (ex.: Closer)'
                                                : 'Agendamentos atendidos pela própria equipe')
                                            : 'Total de agendamentos recebidos e realizados'}
                                    </p>
                                    {scopeSwitch && <div className="mt-3">{scopeSwitch}</div>}
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-lg font-bold text-foreground">Total: {total}</span>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setRankingModal({
                                            isOpen: true,
                                            type: displaySector,
                                            title: `Ranking ${displaySector} Completo`,
                                            data: ranking
                                        })}
                                    >
                                        Expandir
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 text-[10px] font-semibold text-secondary mb-3 px-3 uppercase">
                                    <div className="col-span-6">Nome</div>
                                    <div className="col-span-3 text-center text-emerald-500">Realizados</div>
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
                                    let rowStyle = 'bg-background border-l-4 border-transparent';
                                    if (item.originalRank === 0) rowStyle = 'bg-yellow-500/5 border-l-4 border-yellow-500';
                                    else if (item.originalRank === 1) rowStyle = 'bg-blue-500/5 border-l-4 border-[#3D719D]';
                                    else if (item.originalRank === 2) rowStyle = 'bg-orange-500/5 border-l-4 border-[#C68E63]';

                                    return (
                                        <div key={idx} className={`grid grid-cols-12 items-center p-3 rounded-r-lg ${rowStyle} transition-colors min-h-[52px]`}>
                                            <div className="col-span-6 font-medium text-foreground text-[13px] truncate" title={item.name}>
                                                {item.name}
                                            </div>
                                            <div className="col-span-3 text-center font-bold text-emerald-500 text-xs">
                                                {item['Realizado']}
                                            </div>
                                            <div className="col-span-3 text-center font-bold text-foreground text-xs">
                                                {showOtherTotal ? item.total : item.totalRecebido}
                                            </div>
                                        </div>
                                    );
                                })}
                                {ranking.length === 0 && <p className="text-secondary text-sm text-center py-4">Sem dados para o período</p>}
                            </div>
                        </div>
                    );
                })()}
            </div>}

            {/* Responsáveis (comissão) x criadores */}
            {ownerStats && !isCollaborator && (
                <div className="bg-surface p-6 rounded-xl border border-border mt-6 shadow-sm">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-foreground">Responsáveis — {ownerDisplaySector}</h3>
                        <p className="text-xs text-secondary mt-1">
                            O responsável recebe a comissão. "Repassou" conta os agendamentos que a pessoa criou e o Líder passou para outro responsável. Conta todos os agendamentos, mesmo com o switch de alunos únicos ligado.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="min-w-[520px]">
                            <div className="grid grid-cols-12 text-[10px] font-semibold text-secondary mb-3 px-3 uppercase">
                                <div className="col-span-4">Nome</div>
                                <div className="col-span-2 text-center">Como responsável</div>
                                <div className="col-span-2 text-center text-emerald-500">Realizados</div>
                                <div className="col-span-2 text-center">Assumiu</div>
                                <div className="col-span-2 text-center text-[#FF9100]">Repassou</div>
                            </div>
                            <div className="space-y-2">
                                {ownerStats.map(item => (
                                    <div key={item.id} className="grid grid-cols-12 items-center p-3 rounded-lg bg-background min-h-[44px]">
                                        <div className="col-span-4 font-medium text-foreground text-[13px] truncate" title={item.name}>{item.name}</div>
                                        <div className="col-span-2 text-center font-bold text-foreground text-xs">{item.comoOwner}</div>
                                        <div className="col-span-2 text-center font-bold text-emerald-500 text-xs">{item.realizados}</div>
                                        <div className="col-span-2 text-center font-bold text-foreground text-xs">{item.assumidos}</div>
                                        <div className="col-span-2 text-center font-bold text-[#FF9100] text-xs">{item.repassados}</div>
                                    </div>
                                ))}
                                {ownerStats.length === 0 && <p className="text-secondary text-sm text-center py-4">Sem dados para o período</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chart */}
            <div className="bg-surface p-6 rounded-xl border border-border mt-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-foreground">
                        Agendamentos por Dia
                    </h3>
                    <span className="text-lg font-bold text-foreground">Total: {chartTotal}</span>
                </div>

                <div className="h-80 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                            <XAxis
                                dataKey="displayDate"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                dy={10}
                            />
                            <RechartsTooltip
                                cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
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
                            {['Realizado', 'Pendente', 'Cancelado', 'Reagendado', 'Esquecimento', 'No-show'].map((status) => (
                                selectedStatuses.includes(status) && (
                                    <Bar
                                        key={status}
                                        dataKey={status}
                                        stackId="a"
                                        fill={
                                            status === 'Realizado' ? '#00E676' :
                                                status === 'Pendente' ? '#B2B2B2' :
                                                status === 'Cancelado' ? '#FF1744' :
                                                status === 'Reagendado' ? '#2979FF' :
                                                status === 'Esquecimento' ? '#D500F9' :
                                                '#FF9100'
                                        }
                                        radius={[0, 0, 0, 0]}
                                        barSize={32}
                                    />
                                )
                            ))}
                            <Line type="monotone" dataKey="total" stroke="#333333" strokeWidth={2} dot={{ fill: "#333333", r: 4 }}>
                                <LabelList dataKey="total" position="top" fill="#333333" fontSize={12} />
                            </Line>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Status Toggle Buttons */}
                <div className="flex flex-wrap gap-3 justify-center mt-4">
                    {['Realizado', 'Pendente', 'Cancelado', 'Reagendado', 'Esquecimento', 'No-show'].map((status) => (
                        <button
                            key={status}
                            onClick={() => toggleStatus(status)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                                selectedStatuses.includes(status)
                                    ? "border-transparent text-white"
                                    : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                            )}
                            style={{
                                backgroundColor: selectedStatuses.includes(status)
                                    ? status === 'Realizado' ? '#00E676' :
                                      status === 'Pendente' ? '#B2B2B2' :
                                      status === 'Cancelado' ? '#FF1744' :
                                      status === 'Reagendado' ? '#2979FF' :
                                      status === 'No-show' ? '#FF9100' :
                                      '#666'
                                    : undefined
                            }}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Ranking Modal */}
            <RankingModal
                isOpen={rankingModal.isOpen}
                onClose={() => setRankingModal({ ...rankingModal, isOpen: false })}
                title={rankingModal.title}
                data={rankingModal.data}
                type={rankingModal.type}
            />
        </div>
    );
};
