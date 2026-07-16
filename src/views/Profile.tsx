import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import { useFormData } from '../hooks/useFormData';
import {
    ResponsiveContainer,
    ComposedChart,
    XAxis,
    Tooltip as RechartsTooltip,
    Bar,
    Line,
    LabelList
} from 'recharts';
import { cn } from '../components/ui/button';
import { User, Mail, Clock, Coffee, Shield, BarChart3, Building2 } from 'lucide-react';
import { APPOINTMENT_STATUSES, AppointmentStatus } from '../types';
import { FloatingSelect } from '../components/FloatingSelect';

const DAYS_OF_WEEK = [
    { key: 'mon', label: 'Segunda-feira', short: 'Seg' },
    { key: 'tue', label: 'Terça-feira', short: 'Ter' },
    { key: 'wed', label: 'Quarta-feira', short: 'Qua' },
    { key: 'thu', label: 'Quinta-feira', short: 'Qui' },
    { key: 'fri', label: 'Sexta-feira', short: 'Sex' },
    { key: 'sat', label: 'Sábado', short: 'Sáb' },
    { key: 'sun', label: 'Domingo', short: 'Dom' }
];

export const Profile: React.FC = () => {
    const { user } = useAuth();
    const { appointments } = useAppointments();
    const { attendants } = useFormData();

    const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
    const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
    const [selectedStatuses, setSelectedStatuses] = useState<AppointmentStatus[]>([...APPOINTMENT_STATUSES]);

    // Encontra o registro de atendente correspondente ao usuário logado
    const myAttendant = useMemo(() => {
        if (!user) return null;
        return attendants.find(a => a.id === user.id || a.email === user.email) || null;
    }, [attendants, user]);

    const displayName = user?.name || myAttendant?.name || 'Não informado';
    const displayEmail = user?.email || myAttendant?.email || 'Não informado';
    const displayRole = user?.role || myAttendant?.role || 'Colaborador';
    const displaySector = user?.sector || myAttendant?.sector || 'Não informado';

    // Opções de Mês e Ano
    const monthOptions = useMemo(() => [
        { value: '01', label: '01 - Janeiro' },
        { value: '02', label: '02 - Fevereiro' },
        { value: '03', label: '03 - Março' },
        { value: '04', label: '04 - Abril' },
        { value: '05', label: '05 - Maio' },
        { value: '06', label: '06 - Junho' },
        { value: '07', label: '07 - Julho' },
        { value: '08', label: '08 - Agosto' },
        { value: '09', label: '09 - Setembro' },
        { value: '10', label: '10 - Outubro' },
        { value: '11', label: '11 - Novembro' },
        { value: '12', label: '12 - Dezembro' }
    ], []);

    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return [
            { value: (currentYear - 2).toString(), label: (currentYear - 2).toString() },
            { value: (currentYear - 1).toString(), label: (currentYear - 1).toString() },
            { value: currentYear.toString(), label: currentYear.toString() },
            { value: (currentYear + 1).toString(), label: (currentYear + 1).toString() }
        ];
    }, []);

    const toggleStatus = (status: AppointmentStatus) => {
        if (selectedStatuses.includes(status)) {
            if (selectedStatuses.length > 1) {
                setSelectedStatuses(selectedStatuses.filter(s => s !== status));
            }
        } else {
            setSelectedStatuses([...selectedStatuses, status]);
        }
    };

    // Gera os dados do gráfico para o mês e ano selecionados apenas dos agendamentos onde o usuário é o atendente
    const { chartData, chartTotal } = useMemo(() => {
        if (!user) return { chartData: [], chartTotal: 0 };

        const myAppointments = appointments.filter(a => {
            const isMyAttendant = a.attendantId === user.id || (myAttendant && a.attendantId === myAttendant.id);
            return isMyAttendant;
        });

        const year = parseInt(selectedYear, 10);
        const monthIndex = parseInt(selectedMonth, 10) - 1; // 0-indexed

        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

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

        for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(year, monthIndex, day, 12, 0, 0);
            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const display = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            dateMap.set(dateStr, {
                displayDate: display,
                rawDate: d.getTime(),
                total: 0,
                'Cancelado': 0,
                'Esquecimento': 0,
                'No-show': 0,
                'Pendente': 0,
                'Realizado': 0,
                'Reagendado': 0
            });
        }

        myAppointments.forEach(a => {
            const key = a.date;
            if (dateMap.has(key)) {
                const stats = dateMap.get(key)!;
                if (a.status as string in stats) {
                    stats[a.status as AppointmentStatus]++;
                }
            }
        });

        const sortedData = Array.from(dateMap.values()).sort((a, b) => a.rawDate - b.rawDate);

        const dataWithTotal = sortedData.map(item => {
            let total = 0;
            selectedStatuses.forEach(status => {
                if (status in item) {
                    total += (item as any)[status];
                }
            });
            return { ...item, total };
        });

        const totalCount = dataWithTotal.reduce((acc, curr) => acc + curr.total, 0);

        return { chartData: dataWithTotal, chartTotal: totalCount };
    }, [appointments, user, myAttendant, selectedMonth, selectedYear, selectedStatuses]);

    return (
        <div className="space-y-8">
            {/* User Info Card */}
            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-primary shrink-0">
                            <User size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">{displayName}</h2>
                            <div className="flex items-center gap-2 text-secondary text-sm mt-1">
                                <Mail size={16} className="text-muted-foreground" />
                                <span>{displayEmail}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-lg border border-border">
                            <Shield size={16} className="text-primary" />
                            <div className="text-xs">
                                <span className="text-muted-foreground block">Cargo / Perfil</span>
                                <span className="font-semibold text-foreground">{displayRole}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-lg border border-border">
                            <Building2 size={16} className="text-[#3D719D]" />
                            <div className="text-xs">
                                <span className="text-muted-foreground block">Setor</span>
                                <span className="font-semibold text-foreground">{displaySector}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Escala e Pausas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Escala de Trabalho */}
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                        <Clock size={20} className="text-primary" />
                        <h3 className="text-lg font-bold text-foreground">Escala de Trabalho</h3>
                    </div>

                    <div className="space-y-3 flex-1">
                        {DAYS_OF_WEEK.map(day => {
                            const sched = myAttendant?.schedule?.[day.key];
                            const hasSchedule = sched && sched.start && sched.end;

                            return (
                                <div key={day.key} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/60">
                                    <span className="text-sm font-medium text-foreground">{day.label}</span>
                                    {hasSchedule ? (
                                        <span className="text-sm font-semibold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20">
                                            {sched.start} às {sched.end}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic bg-muted/40 px-3 py-1 rounded-md">
                                            Folga / Sem horário
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Pausas Registradas */}
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                        <Coffee size={20} className="text-orange-500" />
                        <h3 className="text-lg font-bold text-foreground">Pausas Registradas</h3>
                    </div>

                    <div className="space-y-3 flex-1">
                        {DAYS_OF_WEEK.map(day => {
                            const dayPauses = myAttendant?.pauses?.[day.key] || [];
                            const hasPauses = dayPauses.length > 0;

                            return (
                                <div key={day.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-background border border-border/60 gap-2">
                                    <span className="text-sm font-medium text-foreground">{day.label}</span>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {hasPauses ? (
                                            dayPauses.map((pause, idx) => (
                                                <span key={idx} className="text-xs font-semibold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20">
                                                    {pause.start} - {pause.end}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic bg-muted/40 px-3 py-1 rounded-md">
                                                Sem pausas
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Agendamentos por Dia Chart */}
            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <BarChart3 size={22} className="text-primary" />
                        <h3 className="text-lg font-bold text-foreground">
                            Agendamentos por Dia (Meus Agendamentos)
                        </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <FloatingSelect
                            label="Mês"
                            value={selectedMonth}
                            onChange={(e: any) => setSelectedMonth(e.target.value)}
                            options={monthOptions}
                            className="w-36"
                        />

                        <FloatingSelect
                            label="Ano"
                            value={selectedYear}
                            onChange={(e: any) => setSelectedYear(e.target.value)}
                            options={yearOptions}
                            className="w-28"
                        />

                        <div className="bg-background px-4 py-2 rounded-lg border border-border text-center ml-2">
                            <span className="text-xs text-muted-foreground block uppercase font-semibold">Total do Mês</span>
                            <span className="text-lg font-bold text-foreground">{chartTotal}</span>
                        </div>
                    </div>
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
                                selectedStatuses.includes(status as AppointmentStatus) && (
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
                <div className="flex flex-wrap gap-3 justify-center mt-6">
                    {['Realizado', 'Pendente', 'Cancelado', 'Reagendado', 'Esquecimento', 'No-show'].map((status) => (
                        <button
                            key={status}
                            onClick={() => toggleStatus(status as AppointmentStatus)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                                selectedStatuses.includes(status as AppointmentStatus)
                                    ? "border-transparent text-white shadow-sm"
                                    : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                            )}
                            style={{
                                backgroundColor: selectedStatuses.includes(status as AppointmentStatus)
                                    ? status === 'Realizado' ? '#00E676' :
                                        status === 'Pendente' ? '#B2B2B2' :
                                        status === 'Cancelado' ? '#FF1744' :
                                        status === 'Reagendado' ? '#2979FF' :
                                        status === 'Esquecimento' ? '#D500F9' :
                                        '#FF9100'
                                    : undefined
                            }}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
