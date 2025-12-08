import React, { useState, useMemo } from 'react';
import { useAppointments } from '../context/AppointmentContext';
import { useFormData } from '../hooks/useFormData';
import { Users, CheckCircle, TrendingUp, Trophy, BarChart2, Filter, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select, Input } from '../components/ui/Input';
import { ExportIcon } from '../components/ExportIcon';

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
            if (app.type === 'SDR Call') {
                sdrId = app.attendantId;
            } else if (app.createdBy) {
                const found = attendants.find(a => a.name === app.createdBy && a.sector === 'SDR');
                if (found) sdrId = found.id;
            }

            if (sdrId && metrics[sdrId]) {
                metrics[sdrId].total++;
                if (app.type === 'Closer Call') metrics[sdrId].ligacao++;
                if (app.type === 'Reschedule') metrics[sdrId].reagendamento++;
                if (app.status === 'Confirmado' || app.status === 'Concluido') metrics[sdrId].confirmed++;
            }
        });

        return Object.values(metrics)
            .filter(m => m.total > 0)
            .sort((a, b) => b.total - a.total);
    }, [filteredAppointments, attendants]);

    // --- CLOSER RANKING LOGIC ---
    const closerRanking = useMemo(() => {
        const closerApps = filteredAppointments.filter(app =>
            app.type === 'Closer Call' || app.type === 'Reschedule'
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
                if (app.status === 'Concluido') metrics[closerId].realized++;
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
            if (app.type === 'Closer Call' || app.type === 'Reschedule') {
                // Normalize date (assuming YYYY-MM-DD)
                const date = app.date;
                if (!data[date]) data[date] = { total: 0, realized: 0, notRealized: 0, canceled: 0 };

                data[date].total++;
                if (app.status === 'Concluido') data[date].realized++;
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
    const confirmedCount = filteredAppointments.filter(a => a.status === 'Confirmado' || a.status === 'Concluido').length;
    const conversionRate = totalAppointments > 0 ? Math.round((confirmedCount / totalAppointments) * 100) : 0;

    // --- CHART SCALING ---
    const maxChartValue = Math.max(
        ...chartData.map(d => Math.max(d.total, d.realized, d.notRealized, d.canceled)),
        5 // Minimum scale
    );

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col gap-4 bg-surface p-4 rounded-xl border border-border">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-secondary" />
                        <Select
                            value={attendantFilter}
                            onChange={e => setAttendantFilter(e.target.value)}
                            options={[{ value: '', label: 'Todos os Atendentes' }, ...attendants.map(a => ({ value: a.id, label: a.name }))]}
                            className="w-48"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-secondary" />
                        <Select
                            value={eventFilter}
                            onChange={e => setEventFilter(e.target.value)}
                            options={[{ value: '', label: 'Todos os Eventos' }, ...events.map(e => ({ value: e.id, label: e.name }))]}
                            className="w-48"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Select
                            value={periodFilter}
                            onChange={e => setPeriodFilter(e.target.value)}
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
                            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                            <span className="text-secondary">até</span>
                            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                        </div>
                    )}
                    <div className="ml-auto">
                        <Button onClick={downloadCSV} variant="secondary">
                            <ExportIcon size={18} /> Exportar CSV
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                            <Users size={24} />
                        </div>

                    </div>
                    <h3 className="text-secondary text-sm font-medium mb-1">Total Agendamentos</h3>
                    <p className="text-3xl font-bold text-primary">{totalAppointments}</p>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-green-500/10 text-green-400">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                    <h3 className="text-secondary text-sm font-medium mb-1">Confirmados/Realizados</h3>
                    <p className="text-3xl font-bold text-primary">{confirmedCount}</p>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <h3 className="text-secondary text-sm font-medium mb-1">Taxa de Conversão</h3>
                    <p className="text-3xl font-bold text-primary">{conversionRate}%</p>
                </div>
            </div>

            {/* Rankings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SDR Ranking */}
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Trophy className="text-yellow-500" size={20} />
                        <h3 className="text-lg font-semibold text-primary">Ranking SDRs</h3>
                    </div>
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {sdrRanking.map((sdr, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold border ${idx === 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                        idx === 1 ? 'bg-gray-100 text-gray-700 border-gray-200' :
                                            idx === 2 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                'bg-surface text-secondary border-border'
                                        }`}>
                                        {idx + 1}
                                    </span>
                                    <span className="font-medium text-primary truncate max-w-[120px]" title={sdr.name}>{sdr.name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-primary">{sdr.total} <span className="text-xs font-normal text-secondary">agendamentos</span></div>
                                    <div className="text-xs text-secondary flex gap-2 justify-end">
                                        <span className="text-blue-600">{sdr.ligacao} Lig</span>
                                        <span className="text-orange-600">{sdr.reagendamento} Reag</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {sdrRanking.length === 0 && <p className="text-secondary text-sm text-center py-4">Sem dados para o período</p>}
                    </div>
                </div>

                {/* Closer Ranking */}
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Trophy className="text-yellow-500" size={20} />
                        <h3 className="text-lg font-semibold text-primary">Ranking Closers</h3>
                    </div>
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {closerRanking.map((closer, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold border ${idx === 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                        idx === 1 ? 'bg-gray-100 text-gray-700 border-gray-200' :
                                            idx === 2 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                'bg-surface text-secondary border-border'
                                        }`}>
                                        {idx + 1}
                                    </span>
                                    <span className="font-medium text-primary truncate max-w-[120px]" title={closer.name}>{closer.name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-green-600">{closer.realized} <span className="text-xs font-normal text-secondary">realizados</span></div>
                                    <div className="text-xs text-secondary">{closer.total} total</div>
                                </div>
                            </div>
                        ))}
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

                <div className="h-80 w-full relative">
                    {/* Simple SVG Line Chart */}
                    {chartData.length > 0 ? (
                        <svg className="w-full h-full" viewBox={`0 0 ${chartData.length * 50} 100`} preserveAspectRatio="none">
                            {/* Grid Lines */}
                            <line x1="0" y1="0" x2="100%" y2="0" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4" />
                            <line x1="0" y1="25" x2="100%" y2="25" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4" />
                            <line x1="0" y1="50" x2="100%" y2="50" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4" />
                            <line x1="0" y1="75" x2="100%" y2="75" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4" />
                            <line x1="0" y1="100" x2="100%" y2="100" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4" />

                            {/* Lines */}
                            {/* Total - Blue */}
                            <polyline
                                fill="none"
                                stroke="#000AFF"
                                strokeWidth="2"
                                points={chartData.map((d, i) => `${i * 50 + 25},${100 - (d.total / maxChartValue) * 100}`).join(' ')}
                            />
                            {/* Realized - Green */}
                            <polyline
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2"
                                points={chartData.map((d, i) => `${i * 50 + 25},${100 - (d.realized / maxChartValue) * 100}`).join(' ')}
                            />
                            {/* Not Realized - Orange */}
                            <polyline
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2"
                                points={chartData.map((d, i) => `${i * 50 + 25},${100 - (d.notRealized / maxChartValue) * 100}`).join(' ')}
                            />

                            {/* Points and Tooltips (Simplified as circles) */}
                            {chartData.map((d, i) => (
                                <g key={i}>
                                    <circle cx={i * 50 + 25} cy={100 - (d.total / maxChartValue) * 100} r="3" fill="#000AFF" />
                                    <circle cx={i * 50 + 25} cy={100 - (d.realized / maxChartValue) * 100} r="3" fill="#10b981" />
                                    <circle cx={i * 50 + 25} cy={100 - (d.notRealized / maxChartValue) * 100} r="3" fill="#f59e0b" />

                                    {/* X Axis Label */}
                                    <text x={i * 50 + 25} y="115" fontSize="10" textAnchor="middle" fill="#6b7280">{d.displayDate}</text>
                                </g>
                            ))}
                        </svg>
                    ) : (
                        <div className="flex items-center justify-center h-full text-secondary">
                            Sem dados para exibir no gráfico
                        </div>
                    )}
                </div>
                <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#000AFF]"></div>
                        <span className="text-xs text-secondary">Total</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                        <span className="text-xs text-secondary">Realizados</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
                        <span className="text-xs text-secondary">Não Realizados</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
