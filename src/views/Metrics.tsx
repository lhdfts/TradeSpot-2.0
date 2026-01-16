import React, { useState, useMemo } from 'react';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { useFormData } from '../hooks/useFormData';
import { Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/input';
import { ExportIcon } from '../components/ExportIcon';
import {
    BarChart,
    Card,
    List,
    ListItem,
} from '@tremor/react';
import { cn } from '../lib/utils';
import { APPOINTMENT_STATUSES, type AppointmentStatus } from '../types';
import { RankingModal } from '../components/RankingModal';

export const Metrics: React.FC = () => {
    const { appointments } = useAppointments();
    const { attendants, events } = useFormData();

    // Filters State
    // Filters State
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const [selectedYear, setSelectedYear] = useState(currentYear.toString());
    const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());


    const [attendantFilter, setAttendantFilter] = useState('');
    const [eventFilter, setEventFilter] = useState('');

    // --- UI STATE ---
    const { user } = useAuth();
    const [sectorFilter, setSectorFilter] = useState('all');

    // Chart State

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

    // --- DATA CALCULATION ---
    const { sdrRanking, closerRanking, chartData, totals } = useMemo(() => {
        // 1. Filter Appointments by Date & Sector (if applicable)
        const filtered = appointments.filter(a => {
            if (!a.date) return false;

            // Period Filter (Month/Year)
            let matchesPeriod = true;
            const apptDate = new Date(a.date + 'T12:00:00');

            // Check against selected Month/Year
            if (apptDate.getMonth() !== parseInt(selectedMonth) || apptDate.getFullYear() !== parseInt(selectedYear)) {
                matchesPeriod = false;
            }

            // Attendant/Event Filters
            const matchesAttendant = !attendantFilter || a.attendantId === attendantFilter;
            const matchesEvent = !eventFilter || a.eventId === eventFilter;

            return matchesPeriod && matchesAttendant && matchesEvent;
        });

        // 2. SDR Ranking
        const sdrMap = new Map<string, { name: string; total: number; ligacao: number; reagendamento: number }>();

        filtered.forEach(a => {
            // Check if created by an SDR (User with role 'Líder', 'Co-Líder', 'SDR' in SDR sector?)
            // Simplify: If createdBy exists, attribute to them.
            if (a.createdBy) {
                // Find creator details
                const creator = attendants.find(att => att.id === a.createdBy);
                if (creator && (sectorFilter === 'all' || creator.sector === 'SDR' || creator.sector === 'Leads')) {
                    if (!sdrMap.has(a.createdBy)) {
                        sdrMap.set(a.createdBy, { name: creator.name, total: 0, ligacao: 0, reagendamento: 0 });
                    }
                    const stats = sdrMap.get(a.createdBy)!;
                    stats.total++;
                    if (a.type === 'Ligação Closer') stats.ligacao++;
                    if (a.type === 'Reagendamento Closer') stats.reagendamento++;
                }
            }
        });
        const sdrRanking = Array.from(sdrMap.values()).sort((a, b) => b.total - a.total);


        // 3. Closer Ranking
        const closerMap = new Map<string, { name: string; realized: number; total: number }>();

        filtered.forEach(a => {
            if (a.attendantId) {
                const attendant = attendants.find(att => att.id === a.attendantId);
                // Filter by Closer Sector
                if (attendant && (sectorFilter === 'all' || attendant.sector === 'Closer')) {
                    if (!closerMap.has(a.attendantId)) {
                        closerMap.set(a.attendantId, { name: attendant.name, realized: 0, total: 0 });
                    }
                    const stats = closerMap.get(a.attendantId)!;
                    stats.total++;
                    if (a.status === 'Realizado') stats.realized++;
                }
            }
        });
        const closerRanking = Array.from(closerMap.values()).sort((a, b) => b.realized - a.realized);

        // 4. Chart Data (Closer Daily Performance)
        // Group by Date or Hour
        // Initialize map with correct typing for dynamic status keys + metadata
        type ChartItem = {
            displayDate: string;
            rawDate: number;
            total: number;
            // Statuses
            'Cancelado': number;
            'Esquecimento': number;
            'Não compareceu': number;
            'Pendente': number;
            'Realizado': number;
            'Reagendado': number;
            // Moving Average
            movingAverage?: number;
        };

        const dateMap = new Map<string, ChartItem>();

        // Helper to create initial object
        const createInitItem = (display: string, raw: number): ChartItem => ({
            displayDate: display,
            rawDate: raw,
            total: 0,
            'Cancelado': 0,
            'Esquecimento': 0,
            'Não compareceu': 0,
            'Pendente': 0,
            'Realizado': 0,
            'Reagendado': 0
        });

        // Initialize map with ALL days of the selected month
        const year = parseInt(selectedYear);
        const month = parseInt(selectedMonth);
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const dateStr = dateObj.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-'); // YYYY-MM-DD
            const display = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            // For sorting, rawDate is timestamp
            dateMap.set(dateStr, createInitItem(display, dateObj.getTime()));
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



        // Calculate Totals for the List
        const totals: Record<string, number> = {};
        APPOINTMENT_STATUSES.forEach(status => totals[status] = 0);
        chartData.forEach(item => {
            APPOINTMENT_STATUSES.forEach(status => {
                if (status in item) {
                    totals[status] += (item as any)[status];
                }
            });
        });

        return { sdrRanking, closerRanking, chartData, totals };
    }, [appointments, selectedMonth, selectedYear, attendantFilter, eventFilter, attendants, sectorFilter]);

    const statusColors: Record<string, string> = {
        'Realizado': 'emerald',
        'Pendente': 'amber',
        'Cancelado': 'red',
        'Reagendado': 'blue',
        'Esquecimento': 'violet',
        'Não compareceu': 'rose'
    };

    const valueFormatter = (number: number) =>
        Intl.NumberFormat('pt-BR').format(number).toString();

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col gap-4 bg-surface p-4 rounded-xl border border-border">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Sector Filter for Admin/Dev/Qualidade */}
                    {(user?.role === 'Admin' || user?.role === 'Dev' || user?.role === 'Qualidade') && (
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-secondary" />
                            <Select
                                value={sectorFilter}
                                onChange={(e: any) => setSectorFilter(e.target.value)}
                                options={[
                                    { value: 'all', label: 'Todos os Setores' },
                                    { value: 'SDR', label: 'SDR' },
                                    { value: 'Closer', label: 'Closer' }
                                ]}
                                className="w-40"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <Select
                            value={selectedMonth}
                            onChange={(e: any) => setSelectedMonth(e.target.value)}
                            options={[
                                { value: '0', label: 'Janeiro' },
                                { value: '1', label: 'Fevereiro' },
                                { value: '2', label: 'Março' },
                                { value: '3', label: 'Abril' },
                                { value: '4', label: 'Maio' },
                                { value: '5', label: 'Junho' },
                                { value: '6', label: 'Julho' },
                                { value: '7', label: 'Agosto' },
                                { value: '8', label: 'Setembro' },
                                { value: '9', label: 'Outubro' },
                                { value: '10', label: 'Novembro' },
                                { value: '11', label: 'Dezembro' },
                            ]}
                            className="w-40"
                        />
                        <Select
                            value={selectedYear}
                            onChange={(e: any) => setSelectedYear(e.target.value)}
                            options={Array.from({ length: 5 }, (_, i) => {
                                const y = currentYear - 2 + i;
                                return { value: y.toString(), label: y.toString() };
                            })}
                            className="w-28"
                        />
                    </div>

                    <Select
                        value={attendantFilter}
                        onChange={(e: any) => setAttendantFilter(e.target.value)}
                        options={[
                            { value: '', label: 'Todos Atendentes' },
                            ...attendants.map(a => ({ value: a.id, label: a.name }))
                        ]}
                        className="w-48"
                    />

                    <Select
                        value={eventFilter}
                        onChange={(e: any) => setEventFilter(e.target.value)}
                        options={[
                            { value: '', label: 'Todos Eventos' },
                            ...events.map(e => ({ value: e.id, label: e.event_name }))
                        ]}
                        className="w-48"
                    />

                    <div className="cursor-pointer ml-auto">
                        <ExportIcon />
                    </div>
                </div>
            </div>

            {/* KPI Cards (Merged) */}
            {/* ... (KPIs remain global for now, or could filter if desired) ... */}

            {/* Rankings */}
            <div className={`grid grid-cols-1 ${sectorFilter === 'all' ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
                {/* SDR Ranking */}
                {(sectorFilter === 'all' || sectorFilter === 'SDR') && (
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-primary">Agendamentos por SDR</h3>
                                <p className="text-xs text-secondary mt-1">Total de agendamentos marcados (Ligação Closer e Reagendamento Closer)</p>
                            </div>
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

                        <div className="grid grid-cols-12 text-xs font-semibold text-secondary mb-3 px-3">
                            <div className="col-span-5">Nome</div>
                            <div className="col-span-2 text-center">Marcados</div>
                            <div className="col-span-3 text-center">Ligação Closer</div>
                            <div className="col-span-2 text-center">Reagendamento</div>
                        </div>

                        <div className="space-y-2">
                            {sdrRanking.slice(0, 5).map((sdr, idx) => {
                                let rowStyle = 'bg-background border-l-4 border-transparent';
                                if (idx === 0) rowStyle = 'bg-yellow-500/5 border-l-4 border-yellow-500';
                                else if (idx === 1) rowStyle = 'bg-blue-500/5 border-l-4 border-[#3D719D]';
                                else if (idx === 2) rowStyle = 'bg-orange-500/5 border-l-4 border-[#C68E63]';

                                return (
                                    <div key={idx} className={`grid grid-cols-12 items-center p-3 rounded-r-lg ${rowStyle} transition-colors`}>
                                        <div className="col-span-5 font-medium text-primary text-sm truncate" title={sdr.name}>
                                            {sdr.name}
                                        </div>
                                        <div className="col-span-2 text-center font-bold text-blue-600 text-sm">
                                            {sdr.total}
                                        </div>
                                        <div className="col-span-3 text-center text-blue-500 text-sm">
                                            {sdr.ligacao}
                                        </div>
                                        <div className="col-span-2 text-center text-orange-500 text-sm">
                                            {sdr.reagendamento}
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
                                <h3 className="text-lg font-semibold text-primary">Agendamentos por Closer</h3>
                                <p className="text-xs text-secondary mt-1">Total de agendamentos recebidos e realizados</p>
                            </div>
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

                        <div className="grid grid-cols-12 text-xs font-semibold text-secondary mb-3 px-3">
                            <div className="col-span-6">Nome</div>
                            <div className="col-span-3 text-center">Realizados</div>
                            <div className="col-span-3 text-center">Total Recebido</div>
                        </div>

                        <div className="space-y-2">
                            {closerRanking.slice(0, 5).map((closer, idx) => {
                                let rowStyle = 'bg-background border-l-4 border-transparent';
                                if (idx === 0) rowStyle = 'bg-yellow-500/5 border-l-4 border-yellow-500';
                                else if (idx === 1) rowStyle = 'bg-blue-500/5 border-l-4 border-[#3D719D]';
                                else if (idx === 2) rowStyle = 'bg-orange-500/5 border-l-4 border-[#C68E63]';

                                return (
                                    <div key={idx} className={`grid grid-cols-12 items-center p-3 rounded-r-lg ${rowStyle} transition-colors`}>
                                        <div className="col-span-6 font-medium text-primary text-sm truncate" title={closer.name}>
                                            {closer.name}
                                        </div>
                                        <div className="col-span-3 text-center font-bold text-green-600 text-sm">
                                            {closer.realized}
                                        </div>
                                        <div className="col-span-3 text-center font-medium text-green-300 text-sm">
                                            {closer.total}
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
                <Card>
                    <div className="flex items-center gap-2 mb-6">
                        <h3 className="text-lg font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                            Agendamentos por Dia (Closer)
                        </h3>
                    </div>

                    <BarChart
                        data={chartData}
                        index="displayDate"
                        categories={[
                            'Realizado',
                            'Pendente',
                            'Cancelado',
                            'Reagendado',
                            'Esquecimento',
                            'Não compareceu'
                        ]}
                        colors={[
                            statusColors['Realizado'],
                            statusColors['Pendente'],
                            statusColors['Cancelado'],
                            statusColors['Reagendado'],
                            statusColors['Esquecimento'],
                            statusColors['Não compareceu']
                        ]}
                        valueFormatter={valueFormatter}
                        stack={true}
                        showLegend={false}
                        showYAxis={false}
                        showGridLines={false}
                        startEndOnly={false}
                        className="mt-8 h-96"
                    />

                    <List className="mt-8">
                        {APPOINTMENT_STATUSES.map((status) => (
                            <ListItem key={status}>
                                <div className="flex items-center space-x-2">
                                    <span
                                        className={cn(
                                            {
                                                'bg-emerald-500': statusColors[status] === 'emerald',
                                                'bg-amber-500': statusColors[status] === 'amber',
                                                'bg-red-500': statusColors[status] === 'red',
                                                'bg-blue-500': statusColors[status] === 'blue',
                                                'bg-violet-500': statusColors[status] === 'violet',
                                                'bg-rose-500': statusColors[status] === 'rose',
                                            },
                                            'h-2.5 w-2.5 rounded-sm'
                                        )}
                                        aria-hidden="true"
                                    />
                                    <span>{status}</span>
                                </div>
                                <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                    {valueFormatter(totals[status] || 0)}
                                </span>
                            </ListItem>
                        ))}
                    </List>
                </Card>
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
