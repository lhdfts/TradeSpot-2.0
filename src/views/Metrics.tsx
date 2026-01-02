import React, { useState, useMemo } from 'react';
import { useAppointments } from '../context/AppointmentContext';
import { useFormData } from '../hooks/useFormData';
import { Users, CheckCircle, TrendingUp, BarChart2, Filter, Calendar } from 'lucide-react';
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

    // Helper: Get Date Range based on filter
    const getDateRange = () => {
        const now = new Date();
        let start = new Date();
        let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        switch (periodFilter) {
            case 'today':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                break;
            case 'week':
                start.setDate(now.getDate() - 7);
                start.setHours(0, 0, 0, 0);
                break;
            case 'month':
                start.setMonth(now.getMonth() - 1);
                start.setHours(0, 0, 0, 0);
                break;
            case '3months':
                start.setMonth(now.getMonth() - 3);
                start.setHours(0, 0, 0, 0);
                break;
            case '6months':
                start.setMonth(now.getMonth() - 6);
                start.setHours(0, 0, 0, 0);
                break;
            case 'year':
                start.setFullYear(now.getFullYear() - 1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'custom':
                if (customStart && customEnd) {
                    start = new Date(customStart + 'T00:00:00');
                    end = new Date(customEnd + 'T23:59:59');
                } else {
                    return null; // Invalid custom range
                }
                break;
            default:
                return null;
        }
        return { start, end };
    };

    // Apply Filters
    const filteredAppointments = useMemo(() => {
        const range = getDateRange();
        return appointments.filter(app => {
            // Date Filter
            if (range) {
                const appDate = new Date(app.date + 'T00:00:00');
                if (appDate < range.start || appDate > range.end) return false;
            }

            // Attendant Filter (by Name or ID - assuming attendantFilter stores Name for now to match reference, but ID is better. 
            // The reference uses Name. Let's try to match ID if possible, but reference says "attendant" field in appointment is name?
            // In our type, we have attendantId. We should filter by attendantId if we select from dropdown.)
            if (attendantFilter) {
                // Find attendant name for the ID
                const att = attendants.find(a => a.id === attendantFilter);
                if (att && app.attendantId !== att.id) return false;
            }

            // Event Filter
            if (eventFilter && app.eventId !== eventFilter) return false;

            return true;
        });
    }, [appointments, periodFilter, customStart, customEnd, attendantFilter, eventFilter, attendants]);

    // --- SDR RANKING LOGIC ---
    const sdrRanking = useMemo(() => {
        const sdrUsers = attendants.filter(a => a.sector === 'SDR');
        const metrics: Record<string, { name: string, total: number, confirmed: number, ligacao: number, reagendamento: number }> = {};

        sdrUsers.forEach(u => {
            metrics[u.id] = { name: u.name, total: 0, confirmed: 0, ligacao: 0, reagendamento: 0 };
        });

        filteredAppointments.forEach(app => {
            let sdrId = null;
            if (app.type === 'Ligação SDR') {
                sdrId = app.attendantId;
            } else if (app.createdBy) {
                const found = attendants.find(a => a.name === app.createdBy && a.sector === 'SDR');
                if (found) sdrId = found.id;
            }

            if (sdrId && metrics[sdrId]) {
                metrics[sdrId].total++;
                if (app.type === 'Ligação Closer') metrics[sdrId].ligacao++;
                if (app.type === 'Reagendamento Closer') metrics[sdrId].reagendamento++;
                if (app.status === 'Realizado') metrics[sdrId].confirmed++;
            }
        });

        return Object.values(metrics)
            .filter(m => m.total > 0)
            .sort((a, b) => b.total - a.total);
    }, [filteredAppointments, attendants]);

    // --- CLOSER RANKING LOGIC ---
    const closerRanking = useMemo(() => {
        const closerApps = filteredAppointments.filter(app =>
            app.type === 'Ligação Closer' || app.type === 'Reagendamento Closer'
        );

        const metrics: Record<string, { name: string, total: number, realized: number }> = {};

        attendants.filter(a => a.sector === 'Closer').forEach(u => {
            metrics[u.id] = { name: u.name, total: 0, realized: 0 };
        });

        closerApps.forEach(app => {
            const closerId = app.attendantId;
            if (!metrics[closerId]) {
                const att = attendants.find(a => a.id === closerId);
                if (att) {
                    metrics[closerId] = { name: att.name, total: 0, realized: 0 };
                }
            }

            if (metrics[closerId]) {
                metrics[closerId].total++;
                if (app.status === 'Realizado') metrics[closerId].realized++;
            }
        });

        return Object.values(metrics)
            .filter(m => m.total > 0)
            .sort((a, b) => b.realized - a.realized);
    }, [filteredAppointments, attendants]);

    // --- CHART DATA ---
    const chartData = useMemo(() => {
        const data: Record<string, { total: number, realized: number, notRealized: number, canceled: number }> = {};

        filteredAppointments.forEach(app => {
            // Filter logic from reference: Only Closer calls/reschedules
            if (app.type === 'Ligação Closer' || app.type === 'Reagendamento Closer') {
                // Normalize date (assuming YYYY-MM-DD)
                const date = app.date;
                if (!data[date]) data[date] = { total: 0, realized: 0, notRealized: 0, canceled: 0 };

                data[date].total++;
                if (app.status === 'Realizado') data[date].realized++;
                else if (app.status === 'Cancelado') data[date].canceled++;
                else data[date].notRealized++;
            }
        });

        const sortedDates = Object.keys(data).sort();
        return sortedDates.map(date => ({
            date,
            ...data[date],
            displayDate: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        }));
    }, [filteredAppointments]);

    // --- CSV EXPORT ---
    const downloadCSV = () => {
        const headers = [
            'ID', 'Nome do Aluno', 'Telefone', 'Tipo', 'Data', 'Hora',
            'Status', 'Atendente', 'Criado por', 'Perfil de Interesse',
            'Perfil de Conhecimento', 'Perfil Financeiro', 'Google Meet Link', 'Informações Adicionais'
        ];

        const rows = filteredAppointments.map(app => {
            const att = attendants.find(a => a.id === app.attendantId);
            return [
                app.id,
                `"${(app.lead || '').replace(/"/g, '""')}"`,
                app.phone,
                app.type,
                app.date,
                app.time,
                app.status,
                att ? att.name : '',
                app.createdBy,
                `"${(app.studentProfile?.interest || '').replace(/"/g, '""')}"`,
                `"${(app.studentProfile?.knowledge || '').replace(/"/g, '""')}"`,
                `"${(app.studentProfile?.financial ? `${app.studentProfile.financial.currency} ${app.studentProfile.financial.amount}` : '').replace(/"/g, '""')}"`,
                app.meetLink || '',
                `"${(app.notes || '').replace(/"/g, '""')}"`
            ];
        });

        const csvContent = '\uFEFF' + [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agendamentos_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    // --- KPI CALCULATIONS ---
    const totalAppointments = filteredAppointments.length;
    const confirmedCount = filteredAppointments.filter(a => a.status === 'Realizado').length;
    const conversionRate = totalAppointments > 0 ? Math.round((confirmedCount / totalAppointments) * 100) : 0;

    // --- CHART SCALING ---


    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col gap-4 bg-surface p-4 rounded-xl border border-border">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-secondary" />
                        <Select
                            value={attendantFilter}
                            onChange={(e: any) => setAttendantFilter(e.target.value)}
                            options={[{ value: '', label: 'Todos os Atendentes' }, ...attendants.map(a => ({ value: a.id, label: a.name }))]}
                            className="w-48"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-secondary" />
                        <Select
                            value={eventFilter}
                            onChange={(e: any) => setEventFilter(e.target.value)}
                            options={[{ value: '', label: 'Todos os Eventos' }, ...events.map(e => ({ value: e.id, label: e.event_name }))]}
                            className="w-48"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Select
                            value={periodFilter}
                            onChange={(e: any) => setPeriodFilter(e.target.value)}
                            options={[
                                { value: 'today', label: 'Hoje' },
                                { value: 'week', label: 'Últimos 7 dias' },
                                { value: 'month', label: 'Últimos 30 dias' },
                                { value: '3months', label: 'Últimos 3 meses' },
                                { value: '6months', label: 'Últimos 6 meses' },
                                { value: 'year', label: 'Último ano' },
                                { value: 'custom', label: 'Personalizado' }
                            ]}
                            className="w-40 bg-background border border-border rounded-lg text-primary focus:outline-none focus:border-primary"
                        />
                    </div>
                    {periodFilter === 'custom' && (
                        <div className="flex items-center gap-2">
                            <Input type="date" value={customStart} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomStart(e.target.value)} />
                            <span className="text-secondary">até</span>
                            <Input type="date" value={customEnd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomEnd(e.target.value)} />
                        </div>
                    )}
                    <div className="ml-auto">
                        <Button onClick={downloadCSV} variant="secondary">
                            <ExportIcon size={18} /> Exportar CSV
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPI Cards (Merged) */}
            <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-border">
                    {/* Total */}
                    <div className="flex flex-col items-center justify-center p-4">
                        <div className="p-3 rounded-full bg-blue-500/10 text-blue-400 mb-3">
                            <Users size={24} />
                        </div>
                        <p className="text-secondary text-sm font-medium mb-1">Total de Agendamentos</p>
                        <p className="text-3xl font-bold text-primary">{totalAppointments}</p>
                    </div>

                    {/* Realizados */}
                    <div className="flex flex-col items-center justify-center p-4">
                        <div className="p-3 rounded-full bg-green-500/10 text-green-400 mb-3">
                            <CheckCircle size={24} />
                        </div>
                        <p className="text-secondary text-sm font-medium mb-1">Realizados</p>
                        <p className="text-3xl font-bold text-primary">{confirmedCount}</p>
                    </div>

                    {/* Taxa de Conversão */}
                    <div className="flex flex-col items-center justify-center p-4">
                        <div className="p-3 rounded-full bg-purple-500/10 text-purple-400 mb-3">
                            <TrendingUp size={24} />
                        </div>
                        <p className="text-secondary text-sm font-medium mb-1">Taxa de Conversão</p>
                        <p className="text-3xl font-bold text-primary">{conversionRate}%</p>
                    </div>
                </div>
            </div>

            {/* Rankings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SDR Ranking */}
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-primary">Agendamentos por SDR</h3>
                            <p className="text-xs text-secondary mt-1">Total de agendamentos marcados (Ligação Closer e Reagendamento Closer)</p>
                        </div>
                        <Button size="sm" variant="secondary">Expandir</Button>
                    </div>

                    <div className="grid grid-cols-12 text-xs font-semibold text-secondary mb-3 px-3">
                        <div className="col-span-5">Nome</div>
                        <div className="col-span-2 text-center">Marcados</div>
                        <div className="col-span-3 text-center">Ligação Closer</div>
                        <div className="col-span-2 text-center">Reagendamento</div>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                        {sdrRanking.map((sdr, idx) => {
                            let rowStyle = 'bg-background border-l-4 border-transparent';
                            if (idx === 0) rowStyle = 'bg-yellow-500/5 border-l-4 border-yellow-500';
                            else if (idx === 1) rowStyle = 'bg-blue-500/5 border-l-4 border-[#3D719D]'; // Blueish grey
                            else if (idx === 2) rowStyle = 'bg-orange-500/5 border-l-4 border-[#C68E63]'; // Bronze/Orange

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

                {/* Closer Ranking */}
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-primary">Agendamentos por Closer</h3>
                            <p className="text-xs text-secondary mt-1">Total de agendamentos recebidos e realizados</p>
                        </div>
                        <Button size="sm" variant="secondary">Expandir</Button>
                    </div>

                    <div className="grid grid-cols-12 text-xs font-semibold text-secondary mb-3 px-3">
                        <div className="col-span-6">Nome</div>
                        <div className="col-span-3 text-center">Realizados</div>
                        <div className="col-span-3 text-center">Total Recebido</div>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                        {closerRanking.map((closer, idx) => {
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
            </div>

            {/* Chart */}
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
        </div>
    );
};
