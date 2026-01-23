import React, { useState, useMemo } from 'react';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { useFormData } from '../hooks/useFormData';
import { Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { FloatingSelect } from '../components/FloatingSelect';
import { FloatingDateInput } from '../components/FloatingDateInput';
import { ExportIcon } from '../components/ExportIcon';
import {
    ComposedChart,
    Bar,
    XAxis,
    Tooltip,
    ResponsiveContainer,
    Line,
    LabelList
} from 'recharts';
import { cn } from '../lib/utils';
import { APPOINTMENT_STATUSES, type AppointmentStatus } from '../types';
import { RankingModal } from '../components/RankingModal';

interface SDRRankingItem {
    id: string;
    name: string;
    total: number;
    'Realizado': number;
    'Cancelado': number;
    'Esquecimento': number;
    'No-show': number;
    'Reagendado': number;
    'Pendente': number;
    ligacao: number;
    reagendamento: number;
    upgrade: number;
    originalRank?: number;
}

interface CloserRankingItem {
    id: string;
    name: string;
    total: number;
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
    // Default to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);

    const [attendantFilter, setAttendantFilter] = useState('');
    const [eventFilter, setEventFilter] = useState('');
    const [uniqueClients, setUniqueClients] = useState('no'); // 'yes' or 'no'

    // --- UI STATE ---
    const { user } = useAuth();
    const [sectorFilter, setSectorFilter] = useState('all');

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
        type: 'sdr' | 'closer';
        title: string;
        data: any[];
    }>({
        isOpen: false,
        type: 'sdr',
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
    const { sdrRanking, closerRanking, chartData, totals, filteredAppointments, sdrTotal, closerTotal, chartTotal } = useMemo(() => {
        // 1. Filter Appointments by Date & Event
        let filtered = appointments.filter(a => {
            if (!a.date) return false;

            // Period Filter (Date Range)
            if (startDate && endDate) {
                if (a.date < startDate || a.date > endDate) return false;
            } else {
                return false; // Valid range required
            }

            // Event Filter
            if (eventFilter && a.eventId !== eventFilter) return false;

            // Sector Filter (Basic filtering for chart/totals)
            if (sectorFilter !== 'all') {
                const att = attendants.find(at => at.id === (sectorFilter === 'SDR' ? a.createdBy : a.attendantId));
                if (!att) return false;
                const isMatch = sectorFilter === 'SDR'
                    ? (att.sector === 'SDR' || att.sector === 'Leads')
                    : att.sector === sectorFilter;
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

        // 2. SDR Ranking
        const sdrMap = new Map<string, SDRRankingItem>();
        filtered.forEach(a => {
            if (a.createdBy && ['Ligação Closer', 'Reagendamento Closer', 'Upgrade'].includes(a.type)) {
                const creator = attendants.find(att => att.id === a.createdBy);
                if (creator && (creator.sector === 'SDR' || creator.sector === 'Leads')) {
                    if (!sdrMap.has(a.createdBy)) {
                        sdrMap.set(a.createdBy, {
                            id: creator.id,
                            name: creator.name,
                            total: 0,
                            'Realizado': 0,
                            'Cancelado': 0,
                            'Esquecimento': 0,
                            'No-show': 0,
                            'Reagendado': 0,
                            'Pendente': 0,
                            ligacao: 0,
                            reagendamento: 0,
                            upgrade: 0
                        });
                    }
                    const stats = sdrMap.get(a.createdBy)!;
                    stats.total++;
                    if (a.status as string in stats) {
                        stats[a.status]++;
                    }
                    if (a.type === 'Ligação Closer') stats.ligacao++;
                    if (a.type === 'Reagendamento Closer') stats.reagendamento++;
                    if (a.type === 'Upgrade') stats.upgrade++;
                }
            }
        });

        // Calculate original global ranking position
        let sdrRanking = (Array.from(sdrMap.values())
            .sort((a, b) => b.total - a.total)
            .map((item, idx) => ({ ...item, originalRank: idx })) as SDRRankingItem[]);

        // Apply attendant filter IF set
        if (attendantFilter) {
            sdrRanking = sdrRanking.filter(item => item.id === attendantFilter);
        }

        // 3. Closer Ranking
        const closerMap = new Map<string, CloserRankingItem>();
        filtered.forEach(a => {
            if (a.attendantId) {
                const attendant = attendants.find(att => att.id === a.attendantId);
                if (attendant && attendant.sector === 'Closer' && attendant.role === 'Colaborador') {
                    if (!closerMap.has(a.attendantId)) {
                        closerMap.set(a.attendantId, {
                            id: attendant.id,
                            name: attendant.name,
                            total: 0,
                            'Realizado': 0,
                            'Cancelado': 0,
                            'Esquecimento': 0,
                            'No-show': 0,
                            'Reagendado': 0,
                            'Pendente': 0
                        });
                    }
                    const stats = closerMap.get(a.attendantId)!;
                    stats.total++;
                    if (a.status as string in stats) {
                        stats[a.status]++;
                    }
                }
            }
        });

        // Calculate original global ranking position
        let closerRanking = (Array.from(closerMap.values())
            .sort((a, b) => b.Realizado - a.Realizado)
            .map((item, idx) => ({ ...item, originalRank: idx })) as CloserRankingItem[]);

        // Apply attendant filter IF set
        if (attendantFilter) {
            closerRanking = closerRanking.filter(item => item.id === attendantFilter);
        }

        // 4. Chart Data
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

        // Generate dates in range
        const start = new Date(startDate);
        const end = new Date(endDate);
        const loop = new Date(start);
        // Force loop to noon to avoid timezone shift issues during iteration
        loop.setHours(12, 0, 0, 0);
        const endLoop = new Date(end);
        endLoop.setHours(23, 59, 59, 999);

        // Limit chart range to prevent browser hang if range is too huge (e.g. accidental 10 years)
        // Hard limit 366 days
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
            if (sectorFilter !== 'all') {
                const att = attendants.find(at => at.id === a.attendantId);
                if (att?.sector !== sectorFilter) return;
            }
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

        const sdrTotal = sdrRanking.reduce((acc, curr) => acc + curr.total, 0);
        const closerTotal = closerRanking.reduce((acc, curr) => acc + curr.total, 0);
        const chartTotal = chartData.reduce((acc, curr) => acc + curr.total, 0);

        return { sdrRanking, closerRanking, chartData, totals, filteredAppointments: filtered, sdrTotal, closerTotal, chartTotal };
    }, [appointments, startDate, endDate, attendantFilter, eventFilter, attendants, sectorFilter, uniqueClients]);


    const valueFormatter = (number: number) =>
        Intl.NumberFormat('pt-BR').format(number).toString();

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

                    {/* Sector Filter for Admin/Dev/Qualidade */}
                    {(user?.role === 'Admin' || user?.role === 'Dev' || user?.role === 'Qualidade') && (
                        <FloatingSelect
                            label="Setor"
                            value={sectorFilter}
                            onChange={(e: any) => setSectorFilter(e.target.value)}
                            options={[
                                { value: 'all', label: 'Todos os Setores' },
                                { value: 'SDR', label: 'SDR' },
                                { value: 'Closer', label: 'Closer' }
                            ]}
                            className="w-40"
                        />
                    )}

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
            <div className={cn("grid grid-cols-1 gap-6", sectorFilter === 'all' ? "md:grid-cols-2" : "md:grid-cols-1")}>
                {/* SDR Ranking */}
                {(sectorFilter === 'all' || sectorFilter === 'SDR') && (
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Agendamentos por SDR</h3>
                                <p className="text-xs text-secondary mt-1">Total de agendamentos marcados</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-lg font-bold text-foreground">Total: {sdrTotal}</span>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setRankingModal({
                                        isOpen: true,
                                        type: 'sdr',
                                        title: 'Ranking SDR Completo',
                                        data: sdrRanking
                                    })}
                                >
                                    Expandir
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 text-[10px] font-semibold text-secondary mb-3 px-3 uppercase">
                            <div className="col-span-4">Nome</div>
                            <div className="col-span-2 text-center">T. Marc.</div>
                            <div className="col-span-2 text-center text-blue-500">Lig. Clo.</div>
                            <div className="col-span-2 text-center text-orange-500">R. Clo.</div>
                            <div className="col-span-2 text-center text-purple-500">Upgrade</div>
                        </div>

                        <div className="space-y-2">
                            {sdrRanking.slice(0, 5).map((sdr, idx) => {
                                let rowStyle = 'bg-background border-l-4 border-transparent';
                                if (sdr.originalRank === 0) rowStyle = 'bg-yellow-500/5 border-l-4 border-yellow-500';
                                else if (sdr.originalRank === 1) rowStyle = 'bg-blue-500/5 border-l-4 border-[#3D719D]';
                                else if (sdr.originalRank === 2) rowStyle = 'bg-orange-500/5 border-l-4 border-[#C68E63]';

                                return (
                                    <div key={idx} className={`grid grid-cols-12 items-center p-3 rounded-r-lg ${rowStyle} transition-colors min-h-[52px]`}>
                                        <div className="col-span-4 font-medium text-foreground text-[13px] truncate" title={sdr.name}>
                                            {sdr.name}
                                        </div>
                                        <div className="col-span-2 text-center font-bold text-foreground text-xs">
                                            {sdr.total}
                                        </div>
                                        <div className="col-span-2 text-center text-blue-400 text-xs font-medium">
                                            {sdr.ligacao}
                                        </div>
                                        <div className="col-span-2 text-center text-orange-400 text-xs font-medium">
                                            {sdr.reagendamento}
                                        </div>
                                        <div className="col-span-2 text-center text-purple-400 text-xs font-medium">
                                            {sdr.upgrade}
                                        </div>
                                    </div>
                                );
                            })}
                            {sdrRanking.length === 0 && <p className="text-secondary text-sm text-center py-4">Sem dados para o período</p>}
                        </div>
                    </div>
                )}

                {/* Closer Ranking */}
                {(sectorFilter === 'all' || sectorFilter === 'Closer') && (
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Agendamentos por Closer</h3>
                                <p className="text-xs text-secondary mt-1">Total de agendamentos recebidos e realizados</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-lg font-bold text-foreground">Total: {closerTotal}</span>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setRankingModal({
                                        isOpen: true,
                                        type: 'closer',
                                        title: 'Ranking Closer Completo',
                                        data: closerRanking
                                    })}
                                >
                                    Expandir
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 text-[10px] font-semibold text-secondary mb-3 px-3 uppercase">
                            <div className="col-span-6">Nome</div>
                            <div className="col-span-3 text-center">T. Rec.</div>
                            <div className="col-span-3 text-center text-emerald-500">Real.</div>
                        </div>

                        <div className="space-y-2">
                            {closerRanking.slice(0, 5).map((closer, idx) => {
                                let rowStyle = 'bg-background border-l-4 border-transparent';
                                if (closer.originalRank === 0) rowStyle = 'bg-yellow-500/5 border-l-4 border-yellow-500';
                                else if (closer.originalRank === 1) rowStyle = 'bg-blue-500/5 border-l-4 border-[#3D719D]';
                                else if (closer.originalRank === 2) rowStyle = 'bg-orange-500/5 border-l-4 border-[#C68E63]';

                                return (
                                    <div key={idx} className={`grid grid-cols-12 items-center p-3 rounded-r-lg ${rowStyle} transition-colors min-h-[52px]`}>
                                        <div className="col-span-6 font-medium text-foreground text-[13px] truncate" title={closer.name}>
                                            {closer.name}
                                        </div>
                                        <div className="col-span-3 text-center font-bold text-foreground text-xs">
                                            {closer.total}
                                        </div>
                                        <div className="col-span-3 text-center font-bold text-emerald-500 text-xs">
                                            {closer.Realizado}
                                        </div>
                                    </div>
                                );
                            })}
                            {closerRanking.length === 0 && <p className="text-secondary text-sm text-center py-4">Sem dados para o período</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Chart */}
            {(sectorFilter === 'all' || sectorFilter === 'Closer') && (
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
                                <Tooltip
                                    cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                                    content={({ active, payload, label }) => {
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
                                                status === 'Realizado' ? '#10b981' :
                                                    status === 'Pendente' ? '#f59e0b' :
                                                        status === 'Cancelado' ? '#ef4444' :
                                                            status === 'Reagendado' ? '#3b82f6' :
                                                                status === 'Esquecimento' ? '#8b5cf6' :
                                                                    '#f43f5e'
                                            }
                                            radius={[0, 0, 0, 0]}
                                            barSize={32}
                                        />
                                    )
                                ))}
                                <Line type="monotone" dataKey="total" stroke="none" isAnimationActive={false}>
                                    <LabelList dataKey="total" position="top" offset={10} style={{ fill: 'var(--foreground)', fontSize: 10, fontWeight: 'bold' }} />
                                </Line>
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Status Toggle Grid */}
                    <div className="mt-8 grid grid-cols-3 gap-3">
                        {APPOINTMENT_STATUSES.map((status) => {
                            const isSelected = selectedStatuses.includes(status);
                            const colorClass = {
                                'Realizado': 'border-emerald-500 bg-emerald-500/10',
                                'Pendente': 'border-amber-500 bg-amber-500/10',
                                'Cancelado': 'border-red-500 bg-red-500/10',
                                'Reagendado': 'border-blue-500 bg-blue-500/10',
                                'Esquecimento': 'border-violet-500 bg-violet-500/10',
                                'No-show': 'border-rose-500 bg-rose-500/10'
                            }[status] || 'border-border';

                            const dotColor = {
                                'Realizado': 'bg-emerald-500',
                                'Pendente': 'bg-amber-500',
                                'Cancelado': 'bg-red-500',
                                'Reagendado': 'bg-blue-500',
                                'Esquecimento': 'bg-violet-500',
                                'No-show': 'bg-rose-500'
                            }[status] || 'bg-border';

                            return (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => toggleStatus(status)}
                                    className={cn(
                                        "flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium",
                                        isSelected
                                            ? `${colorClass} text-foreground`
                                            : "border-border bg-background text-secondary hover:border-muted-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={cn("w-3 h-3 rounded-full", dotColor)} />
                                        <span>{status}</span>
                                    </div>
                                    <span className="font-bold">{valueFormatter(totals[status] || 0)}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <RankingModal
                isOpen={rankingModal.isOpen}
                onClose={() => setRankingModal(prev => ({ ...prev, isOpen: false }))}
                title={rankingModal.title}
                data={rankingModal.data}
                type={rankingModal.type}
            />
        </div>
    );
};
