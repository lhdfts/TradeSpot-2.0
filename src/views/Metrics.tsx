import React, { useState, useMemo } from 'react';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { useFormData } from '../hooks/useFormData';
import { BarChart2, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select, Input } from '../components/ui/input';
import { ExportIcon } from '../components/ExportIcon';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from 'recharts';
import { type AppointmentStatus } from '../types';
import { RankingModal } from '../components/RankingModal';

export const Metrics: React.FC = () => {
    const { appointments } = useAppointments();
    const { attendants, events } = useFormData();

    // Filters State
    const [periodFilter, setPeriodFilter] = useState('month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [attendantFilter, setAttendantFilter] = useState('');
    const [eventFilter, setEventFilter] = useState('');

    // --- UI STATE ---
    const { user } = useAuth();
    const [sectorFilter, setSectorFilter] = useState('all');
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
    const { sdrRanking, closerRanking, chartData, currentRef } = useMemo(() => {
        // 1. Filter Appointments by Date & Sector (if applicable)
        const filtered = appointments.filter(a => {
            if (!a.date) return false;

            // Period Filter
            let matchesPeriod = true;
            const apptDate = new Date(a.date + 'T12:00:00');
            const today = new Date();

            if (periodFilter === 'today') {
                matchesPeriod = apptDate.toDateString() === today.toDateString();
            } else if (periodFilter === 'week') {
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                matchesPeriod = apptDate >= startOfWeek;
            } else if (periodFilter === 'month') {
                matchesPeriod = apptDate.getMonth() === today.getMonth() && apptDate.getFullYear() === today.getFullYear();
            } else if (periodFilter === 'custom' && customStart && customEnd) {
                const start = new Date(customStart + 'T00:00:00');
                const end = new Date(customEnd + 'T23:59:59');
                matchesPeriod = apptDate >= start && apptDate <= end;
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

        filtered.forEach(a => {
            if (sectorFilter !== 'all') {
                const att = attendants.find(at => at.id === a.attendantId);
                if (att?.sector !== sectorFilter) return;
            }

            let key = '';
            let display = '';
            let sortValue = 0;

            if (periodFilter === 'today') {
                if (a.time) {
                    const hour = a.time.split(':')[0];
                    key = `${hour}:00`;
                    display = `${hour}:00`;
                    sortValue = parseInt(hour, 10);
                } else {
                    return;
                }
            } else {
                key = a.date;
                const d = new Date(key + 'T12:00:00');
                display = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                sortValue = d.getTime();
            }

            if (!dateMap.has(key)) {
                dateMap.set(key, createInitItem(display, sortValue));
            }
            const stats = dateMap.get(key)!;
            stats.total++;

            // Increment specific status
            // Ensure status is valid, otherwise ignore or log (types ensure it usually is)
            if (a.status as string in stats) {
                stats[a.status as AppointmentStatus]++;
            }
        });

        // 5. Ensure Current Time is in Data
        const now = new Date();
        let currentRef = '';
        let currentSortValue = 0;

        if (periodFilter === 'today') {
            const hour = now.getHours().toString().padStart(2, '0');
            currentRef = `${hour}:00`;
            currentSortValue = parseInt(hour, 10);
        } else {
            currentRef = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
            currentSortValue = d.getTime();
        }

        if (sectorFilter === 'all' || sectorFilter === 'Closer') {
            if (!dateMap.has(currentRef)) {
                dateMap.set(currentRef, createInitItem(currentRef, currentSortValue));
            }
        }

        const chartData = Array.from(dateMap.values()).sort((a, b) => a.rawDate - b.rawDate);

        return { sdrRanking, closerRanking, chartData, currentRef };
    }, [appointments, periodFilter, customStart, customEnd, attendantFilter, eventFilter, attendants, sectorFilter]);

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

                    <Select
                        value={periodFilter}
                        onChange={(e: any) => setPeriodFilter(e.target.value)}
                        options={[
                            { value: 'today', label: 'Hoje' },
                            { value: 'week', label: 'Esta Semana' },
                            { value: 'month', label: 'Este Mês' },
                            { value: 'custom', label: 'Personalizado' }
                        ]}
                        className="w-40"
                    />

                    {periodFilter === 'custom' && (
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                value={customStart}
                                onChange={(e: any) => setCustomStart(e.target.value)}
                                className="w-auto"
                            />
                            <span className="text-secondary">-</span>
                            <Input
                                type="date"
                                value={customEnd}
                                onChange={(e: any) => setCustomEnd(e.target.value)}
                                className="w-auto"
                            />
                        </div>
                    )}

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
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart2 className="text-primary" size={20} />
                        <h3 className="text-lg font-semibold text-primary">Agendamentos por Dia (Closer)</h3>
                    </div>

                    <div className="h-96 w-full relative">
                        {/* Recharts Implementation */}
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                    <XAxis
                                        dataKey="displayDate"
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        dx={-10}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--surface))',
                                            borderColor: 'hsl(var(--border))',
                                            borderRadius: '0.5rem',
                                            color: 'hsl(var(--foreground))'
                                        }}
                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                        cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />

                                    {/* Stacked Bars for each status */}
                                    <Bar dataKey="Realizado" name="Realizado" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="Pendente" name="Pendente" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="Cancelado" name="Cancelado" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="Reagendado" name="Reagendado" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="Esquecimento" name="Esquecimento" stackId="a" fill="#a855f7" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="Não compareceu" name="Não compareceu" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />

                                    <ReferenceLine x={currentRef} stroke="hsl(var(--primary))" strokeDasharray="3 3" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-secondary">
                                Sem dados para exibir no gráfico
                            </div>
                        )}
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
