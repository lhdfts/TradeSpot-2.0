import React, { useState, useMemo } from 'react';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { useFormData } from '../hooks/useFormData';
import { Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { FloatingSelect } from '../components/FloatingSelect';
import { FloatingDateInput } from '../components/FloatingDateInput';
import { ExportIcon } from '../components/ExportIcon';
import { canViewAllSectors, isMedinaUser, getAllowedSectors } from '../utils/security';
import {
    ComposedChart,
    Bar,
    XAxis,
    Tooltip as RechartsTooltip,
    ResponsiveContainer
} from 'recharts';
import { cn } from '../lib/utils';
import { APPOINTMENT_STATUSES, type AppointmentStatus } from '../types';
import { RankingModal } from '../components/RankingModal';
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider
} from '../components/ui/tooltip';

interface RankingItem {
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

export const Metrics: React.FC = () => {
    const { appointments } = useAppointments();
    const { attendants, events } = useFormData();

    // Filters State
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);

    const [attendantFilter, setAttendantFilter] = useState('');
    const [eventFilter, setEventFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [uniqueClients, setUniqueClients] = useState('no');

    // --- UI STATE ---
    const { user } = useAuth();
    const isPrivilegedUser = canViewAllSectors(user) || user?.role === 'Admin' || user?.role === 'Dev';
    const [sectorFilter, setSectorFilter] = useState(() => {
        if (isPrivilegedUser) return 'all';
        return user?.sector || 'all';
    });

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

    // --- DATA CALCULATION ---
    const { rankings, chartData, filteredAppointments, chartTotal } = useMemo(() => {
        const allowedSectors = getAllowedSectors(user);
        const isGlobalViewer = canViewAllSectors(user);

        // 1. Filter Appointments by Date, Event, Type
        let filtered = appointments.filter(a => {
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

            // Sector Filter
            const creator = attendants.find(att => att.id === a.createdBy);
            const attendant = attendants.find(att => att.id === a.attendantId);

            if (!isGlobalViewer) {
                const matchesAllowedSector = 
                    (creator && creator.sector && allowedSectors.includes(creator.sector)) ||
                    (attendant && attendant.sector && allowedSectors.includes(attendant.sector));
                
                if (!matchesAllowedSector) return false;

                if (sectorFilter !== 'all') {
                    const activeAtt = sectorFilter === 'SDR' ? creator : attendant;
                    if (!activeAtt || !activeAtt.sector) return false;
                    const isMatch = sectorFilter === 'SDR'
                        ? (activeAtt.sector === 'SDR' || activeAtt.sector === 'Leads')
                        : activeAtt.sector === sectorFilter;
                    if (!isMatch) return false;
                }
            } else if (sectorFilter !== 'all') {
                const activeAtt = sectorFilter === 'SDR' ? creator : attendant;
                if (!activeAtt || !activeAtt.sector) return false;
                const isMatch = sectorFilter === 'SDR'
                    ? (activeAtt.sector === 'SDR' || activeAtt.sector === 'Leads')
                    : activeAtt.sector === sectorFilter;
                if (!isMatch) return false;
            }

            return true;
        });

        // 1.5 Unique Clients Logic
        if (eventFilter && uniqueClients === 'yes') {
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
        const sectors = ['SDR', 'Leads', 'Closer', 'Aldeia', 'Tribo', 'Social Seller', 'Perpétuos', 'Suporte', 'TEI', 'Qualidade'];

        sectors.forEach(sector => {
            const map = new Map<string, RankingItem>();
            
            filtered.forEach(a => {
                // For SDR/Leads: count as creator for specific types
                if ((sector === 'SDR' || sector === 'Leads') && a.createdBy && ['Ligação Closer', 'Gold Call', 'Reagendamento Closer', 'Upgrade'].includes(a.type)) {
                    const creator = attendants.find(att => att.id === a.createdBy);
                    if (creator && creator.sector === sector) {
                        if (!map.has(a.createdBy)) {
                            map.set(a.createdBy, {
                                id: creator.id,
                                name: creator.name,
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
                        const stats = map.get(a.createdBy)!;
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

        const start = new Date(startDate);
        const end = new Date(endDate);
        const loop = new Date(start);
        loop.setHours(12, 0, 0, 0);
        const endLoop = new Date(end);
        endLoop.setHours(23, 59, 59, 999);

        let count = 0;
        while (loop <= endLoop && count < 366) {
            const dateStr = loop.toISOString().split('T')[0];
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
                stats.total++;
                if (a.status as string in stats) {
                    stats[a.status as AppointmentStatus]++;
                }
            }
        });

        const sortedData = Array.from(dateMap.values()).sort((a, b) => a.rawDate - b.rawDate);
        const chartData = sortedData;

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
    }, [appointments, startDate, endDate, attendantFilter, eventFilter, typeFilter, attendants, sectorFilter, uniqueClients]);

    const handleExport = () => {
        if (!filteredAppointments.length) return;
        const headers = ['Data', 'Horario', 'Lead', 'Telefone', 'Email', 'Tipo', 'Status', 'Atendente', 'Evento'];
        const csvRows = filteredAppointments.map((appt: any) => {
            const attendant = attendants.find(att => att.id === appt.attendantId);
            const event = events.find(e => e.id === appt.eventId);
            return [
                appt.date,
                appt.time,
                `"${appt.lead?.replace(/"/g, '""')}"`,
                appt.phone,
                appt.email || '',
                appt.type,
                appt.status,
                `"${attendant?.name || ''}"`,
                `"${event?.event_name || ''}"`
            ].map(v => v || '').join(',');
        });
        const csvString = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.body.appendChild(document.createElement('a'));
        link.href = URL.createObjectURL(blob);
        link.download = `metricas_${startDate}_ate_${endDate}.csv`;
        link.click();
        document.body.removeChild(link);
    };

    // Get allowed types for current sector
    const getAllowedTypesForSector = () => {
        const displaySector = sectorFilter === 'all' && user?.sector ? user.sector : sectorFilter;
        const allTypes = ['Ligação SDR', 'Ligação Closer', 'Ligação Equipe Aldeia', 'Agendamento Pessoal', 'Reagendamento Closer', 'Upgrade', 'Fora da agenda', 'Gold Call', 'Onboarding', 'Fechamento'];
        
        if (displaySector === 'all' || !displaySector) {
            return allTypes.map(t => ({ value: t, label: t }));
        }

        let allowed: typeof allTypes[number][] = [];
        
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
        } else if (displaySector === 'Perpétuos') {
            allowed = ['Gold Call', 'Fechamento'];
        } else {
            allowed = [...allTypes];
        }

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
                            maxDate={endDate ? new Date(endDate) : undefined}
                            className="w-36"
                        />
                        <FloatingDateInput
                            label="Data Final"
                            value={endDate}
                            onChange={(e: any) => setEndDate(e.target.value)}
                            minDate={startDate ? new Date(startDate) : undefined}
                            className="w-36"
                        />
                    </div>

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

                    {/* Type Filter */}
                    <FloatingSelect
                        label="Tipo"
                        value={typeFilter}
                        onChange={(e: any) => setTypeFilter(e.target.value)}
                        options={[
                            { value: '', label: 'Todos' },
                            ...getAllowedTypesForSector()
                        ]}
                        className="w-48"
                    />

                    <FloatingSelect
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
                    />

                    <FloatingSelect
                        label="Evento"
                        value={eventFilter}
                        onChange={(e: any) => setEventFilter(e.target.value)}
                        options={[
                            { value: '', label: 'Todos' },
                            ...events
                                .filter(e => {
                                    if (sectorFilter === 'all') return true;
                                    return !e.sector || e.sector === sectorFilter;
                                })
                                .map(e => ({ value: e.id, label: e.event_name }))
                        ]}
                        className="w-48"
                    />

                    {eventFilter && (
                        <FloatingSelect
                            label="Clientes Únicos"
                            value={uniqueClients}
                            onChange={(e: any) => setUniqueClients(e.target.value)}
                            options={[
                                { value: 'no', label: 'Não' },
                                { value: 'yes', label: 'Sim' }
                            ]}
                            className="w-40"
                        />
                    )}
                    <div
                        className="cursor-pointer ml-auto hover:text-blue-500 transition-colors p-2"
                        onClick={handleExport}
                        title="Exportar CSV"
                    >
                        <ExportIcon />
                    </div>
                </div>
            </div>

            {/* Rankings */}
            <div className="grid grid-cols-1 gap-6">
                {(() => {
                    let displaySector = sectorFilter;
                    if (displaySector === 'all' && user?.sector) {
                        displaySector = user.sector;
                    }

                    const ranking = rankings.get(displaySector === 'SDR' ? 'SDR' : displaySector) || 
                                   rankings.get(displaySector === 'Leads' ? 'Leads' : displaySector) || 
                                   [];
                    const total = ranking.reduce((acc, curr) => acc + curr.total, 0);

                    if (ranking.length === 0 && displaySector) {
                        return (
                            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                                <h3 className="text-lg font-bold text-foreground">Agendamentos por {displaySector}</h3>
                                <p className="text-secondary text-sm text-center py-8">Sem dados para o período</p>
                            </div>
                        );
                    }

                    return (
                        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Agendamentos por {displaySector}</h3>
                                    <p className="text-xs text-secondary mt-1">Total de agendamentos recebidos e realizados</p>
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
                                                <span className="cursor-help">Total Recebido</span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-xs">Considera somente agendamentos onde a pessoa é o Atendente, mas não é o Criador</p>
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
                                                {item.totalRecebido}
                                            </div>
                                        </div>
                                    );
                                })}
                                {ranking.length === 0 && <p className="text-secondary text-sm text-center py-4">Sem dados para o período</p>}
                            </div>
                        </div>
                    );
                })()}
            </div>

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
                                            <p className="text-primary font-bold mb-2 border-b border-border pb-1">{label}</p>
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
                                                                <span className="text-xs text-secondary">{item.name}</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-primary">{item.value}</span>
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
                                            status === 'No-show' ? '#FF9100' :
                                            '#666'
                                        }
                                    />
                                )
                            ))}
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
