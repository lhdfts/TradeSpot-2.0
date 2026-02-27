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
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Line,
    LabelList
} from 'recharts';
import { cn } from '../lib/utils';
import { APPOINTMENT_STATUSES, type AppointmentStatus } from '../types';
import { RankingModal } from '../components/RankingModal';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider
} from '../components/ui/tooltip';

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

    const [availabilityDate, setAvailabilityDate] = useState(new Date().toISOString().split('T')[0]);
    const [availabilityAttendant, setAvailabilityAttendant] = useState('');
    const [availabilitySector, setAvailabilitySector] = useState('all');

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
    const { sdrRanking, closerRanking, chartData, totals, filteredAppointments, sdrTotal, closerTotal, chartTotal, availabilityGrid } = useMemo(() => {
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

        const slots: { time: string; color: string; label: string; statusCounts: Record<string, number> }[] = [];

        const currentAttendantId = availabilityAttendant;
        const selectedAtt = attendants.find(a => a.id === currentAttendantId);
        const isAttendantInSector = !availabilitySector || availabilitySector === 'all' || selectedAtt?.sector === availabilitySector;

        // Só calcula os slots se o atendente selecionado for válido para o setor
        if (currentAttendantId && isAttendantInSector) {
            for (let h = 0; h < 24; h++) {
                for (let m = 0; m < 60; m += 15) {
                    const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

                    const slotMinutes = h * 60 + m;

                    const apptsAtTime = appointments.filter(a => {
                        if (a.attendantId !== currentAttendantId || a.date !== availabilityDate) return false;

                        const timeParts = a.time.split(':');
                        if (timeParts.length < 2) return false;

                        const apptH = parseInt(timeParts[0], 10);
                        const apptM = parseInt(timeParts[1], 10);
                        const apptMinutes = apptH * 60 + apptM;

                        const isCloser = selectedAtt?.sector === 'Closer';
                        const duration = isCloser ? 60 : 15;

                        return slotMinutes >= apptMinutes && slotMinutes < apptMinutes + duration;
                    });

                    // Agrupa e conta por status
                    const statusCounts: Record<string, number> = {};
                    apptsAtTime.forEach(a => {
                        statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
                    });

                    // Define a prioridade de exibição da cor
                    const priority: AppointmentStatus[] = ['Realizado', 'Pendente', 'Reagendado', 'Reagendado', 'Cancelado', 'No-show'];
                    const primaryStatus = priority.find(s => statusCounts[s] > 0);

                    let color = 'bg-muted/20';
                    let label = 'Livre';

                    if (primaryStatus) {
                        const colorMap: Record<string, string> = {
                            'Realizado': 'bg-[#00E676]',
                            'Pendente': 'bg-[#B2B2B2]',
                            'Cancelado': 'bg-[#FF1744]',
                            'Reagendado': 'bg-[#2979FF]',
                            'No-show': 'bg-[#FF9100]'
                        };
                        color = colorMap[primaryStatus] || 'bg-blue-500';
                        label = primaryStatus;
                    }
                    slots.push({ time, color, label, statusCounts });
                }
            }
        }

        const sortedFiltered = [...filtered].sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA.getTime() - dateB.getTime();
        });

        return { sdrRanking, closerRanking, chartData, totals, filteredAppointments: sortedFiltered, sdrTotal, closerTotal, chartTotal, availabilityGrid: slots };
    }, [appointments, startDate, endDate, attendantFilter, eventFilter, attendants, sectorFilter, uniqueClients, availabilityAttendant, availabilityDate, availabilitySector]);

    React.useEffect(() => {
        if (availabilitySector !== 'all' && availabilityAttendant) {
            const selectedAtt = attendants.find(a => a.id === availabilityAttendant);
            // Se o atendente não pertence ao novo setor, limpa a seleção
            if (selectedAtt && selectedAtt.sector !== availabilitySector) {
                setAvailabilityAttendant('');
            }
        }
    }, [availabilitySector, availabilityAttendant, attendants]);

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
                                                                status === 'Esquecimento' ? '#D500F9' :
                                                                    '#FF9100'
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
                                'Realizado': 'border-[#00E676] bg-[#00E676]/10',
                                'Pendente': 'border-[#B2B2B2] bg-[#B2B2B2]/10',
                                'Cancelado': 'border-[#FF1744] bg-[#FF1744]/10',
                                'Reagendado': 'border-[#2979FF] bg-[#2979FF]/10',
                                'Esquecimento': 'border-[#D500F9] bg-[#D500F9]/10',
                                'No-show': 'border-[#FF9100] bg-[#FF9100]/10'
                            }[status] || 'border-border';

                            const dotColor = {
                                'Realizado': 'bg-[#00E676]',
                                'Pendente': 'bg-[#B2B2B2]',
                                'Cancelado': 'bg-[#FF1744]',
                                'Reagendado': 'bg-[#2979FF]',
                                'Esquecimento': 'bg-[#D500F9]',
                                'No-show': 'bg-[#FF9100]'
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
            {(sectorFilter === 'all' || sectorFilter === 'Closer') && (
                <Card className="mt-6">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                        <CardTitle>Disponibilidade Detalhada</CardTitle>
                        <div className="flex gap-4">
                            {/* NOVO: Seletor de Setor */}
                            <FloatingSelect
                                label="Setor"
                                value={availabilitySector}
                                onChange={(e: any) => setAvailabilitySector(e.target.value)}
                                options={[
                                    { value: 'all', label: 'Todos' },
                                    { value: 'SDR', label: 'SDR' },
                                    { value: 'Closer', label: 'Closer' }
                                ]}
                                className="w-32"
                            />

                            {/* ATUALIZADO: Seletor de Atendente filtrado por setor */}
                            <FloatingSelect
                                label="Atendente"
                                value={availabilityAttendant}
                                onChange={(e: any) => setAvailabilityAttendant(e.target.value)}
                                options={[
                                    { value: '', label: 'Selecione um atendente' },
                                    ...attendants
                                        .filter(a => availabilitySector === 'all' || a.sector === availabilitySector)
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(a => ({ value: a.id, label: a.name }))
                                ]}
                                className="w-64"
                            />

                            <FloatingDateInput
                                label="Data"
                                value={availabilityDate}
                                onChange={(e: any) => setAvailabilityDate(e.target.value)}
                                className="w-44"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {availabilityAttendant ? (
                            <TooltipProvider>
                                <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-2">
                                    {availabilityGrid.map((slot) => {
                                        const hasAppts = Object.keys(slot.statusCounts).length > 0;

                                        return (
                                            <Tooltip key={slot.time}>
                                                <TooltipTrigger>
                                                    <div
                                                        style={{ backgroundColor: slot.color.startsWith('bg-[') ? slot.color.slice(4, -1) : undefined }}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-2 rounded-md border border-border text-[10px] font-medium transition-all text-white shadow-sm cursor-default",
                                                            !slot.color.startsWith('bg-[') && slot.color,
                                                            slot.color === 'bg-muted/20' && "text-secondary shadow-none"
                                                        )}
                                                    >
                                                        {slot.time}
                                                    </div>
                                                </TooltipTrigger>

                                                {hasAppts && (
                                                    <TooltipContent className="p-3 min-w-[140px]">
                                                        <div className="space-y-2">
                                                            <p className="font-bold border-b border-border pb-1 mb-1">{slot.time}</p>
                                                            <ul className="space-y-1">
                                                                {Object.entries(slot.statusCounts).map(([status, count]) => (
                                                                    <li key={status} className="flex items-center justify-between gap-3 text-[11px]">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <div className={cn(
                                                                                "w-2 h-2 rounded-full",
                                                                                status === 'Realizado' ? 'bg-[#00E676]' :
                                                                                    status === 'Pendente' ? 'bg-[#B2B2B2]' :
                                                                                        status === 'Cancelado' ? 'bg-[#FF1744]' :
                                                                                            status === 'Reagendado' ? 'bg-[#2979FF]' :
                                                                                                'bg-[#FF9100]'
                                                                            )} />
                                                                            <span>{status}</span>
                                                                        </div>
                                                                        <span className="font-bold">{count}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            </TooltipProvider>
                        ) : (
                            <div className="h-40 flex items-center justify-center text-secondary border-2 border-dashed border-border rounded-xl">
                                Selecione um atendente para visualizar a agenda do dia.
                            </div>
                        )}

                        {/* Legenda */}
                        {availabilityAttendant && (
                            <div className="mt-6 flex flex-wrap gap-4 text-xs text-secondary border-t border-border pt-4">
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-muted/20 border border-border" /> Livre</div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#00E676]" /> Realizado</div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#B2B2B2]" /> Pendente</div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#FF1744]" /> Cancelado</div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#2979FF]" /> Reagendado</div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#FF9100]" /> No-show</div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
