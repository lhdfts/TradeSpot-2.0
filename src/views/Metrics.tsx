import React, { useState, useMemo } from 'react';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { useFormData } from '../hooks/useFormData';
import { BarChart2, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select, Input } from '../components/ui/input';
import { ExportIcon } from '../components/ExportIcon';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

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
    const [isSdrExpanded, setIsSdrExpanded] = useState(false);
    const [isCloserExpanded, setIsCloserExpanded] = useState(false);

    // --- DATA CALCULATION ---
    const { sdrRanking, closerRanking, chartData } = useMemo(() => {
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
        // Group by Date
        const dateMap = new Map<string, { displayDate: string; total: number; realized: number, rawDate: number }>();

        filtered.forEach(a => {
            // Only include if attendant is a Closer (for the chart context usually)
            // or just global if 'all'. Let's stick to the filtered set.
            if (sectorFilter !== 'all') {
                const att = attendants.find(at => at.id === a.attendantId);
                if (att?.sector !== sectorFilter) return;
            }

            const dateKey = a.date; // YYYY-MM-DD
            if (!dateMap.has(dateKey)) {
                const d = new Date(dateKey + 'T12:00:00');
                dateMap.set(dateKey, {
                    displayDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    total: 0,
                    realized: 0,
                    rawDate: d.getTime()
                });
            }
            const stats = dateMap.get(dateKey)!;
            stats.total++;
            if (a.status === 'Realizado') stats.realized++;
        });

        const chartData = Array.from(dateMap.values()).sort((a, b) => a.rawDate - b.rawDate);

        return { sdrRanking, closerRanking, chartData };
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

                    <div className="cursor-pointer">
                        <ExportIcon />
                    </div>

                    {/* KPI Cards (Merged) */}
                    {/* ... (KPIs remain global for now, or could filter if desired) ... */}

                    {/* Rankings */}
                    <div className={`grid grid-cols-1 ${sectorFilter === 'all' ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
                        {/* SDR Ranking */}
                        {(sectorFilter === 'all' || sectorFilter === 'SDR') && (
                            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                                {/* ... SDR Content ... */}
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary">Agendamentos por SDR</h3>
                                        <p className="text-xs text-secondary mt-1">Total de agendamentos marcados (Ligação Closer e Reagendamento Closer)</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setIsSdrExpanded(!isSdrExpanded)}
                                    >
                                        {isSdrExpanded ? 'Recolher' : 'Expandir'}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-12 text-xs font-semibold text-secondary mb-3 px-3">
                                    <div className="col-span-5">Nome</div>
                                    <div className="col-span-2 text-center">Marcados</div>
                                    <div className="col-span-3 text-center">Ligação Closer</div>
                                    <div className="col-span-2 text-center">Reagendamento</div>
                                </div>

                                <div className={`space-y-2 ${isSdrExpanded ? 'max-h-96 overflow-y-auto custom-scrollbar' : ''}`}>
                                    {(isSdrExpanded ? sdrRanking : sdrRanking.slice(0, 5)).map((sdr, idx) => {
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
                                {/* ... Closer Content ... */}
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary">Agendamentos por Closer</h3>
                                        <p className="text-xs text-secondary mt-1">Total de agendamentos recebidos e realizados</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setIsCloserExpanded(!isCloserExpanded)}
                                    >
                                        {isCloserExpanded ? 'Recolher' : 'Expandir'}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-12 text-xs font-semibold text-secondary mb-3 px-3">
                                    <div className="col-span-6">Nome</div>
                                    <div className="col-span-3 text-center">Realizados</div>
                                    <div className="col-span-3 text-center">Total Recebido</div>
                                </div>

                                <div className={`space-y-2 ${isCloserExpanded ? 'max-h-96 overflow-y-auto custom-scrollbar' : ''}`}>
                                    {(isCloserExpanded ? closerRanking : closerRanking.slice(0, 5)).map((closer, idx) => {
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
                                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            {/* ... Chart Content ... */}
                                            <defs>
                                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
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
                                                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="total"
                                                name="Total Recebido"
                                                stroke="#3b82f6"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorTotal)"
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="realized"
                                                name="Realizados"
                                                stroke="#22c55e"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorRealized)"
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-secondary">
                                        Sem dados para exibir no gráfico
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
