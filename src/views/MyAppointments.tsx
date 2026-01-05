import React, { useState } from 'react';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { Search, Copy, Calendar, Check } from 'lucide-react';
import type { Appointment } from '../types';
import { Button } from '../components/ui/button';
import { FloatingInput } from '../components/FloatingInput';
import { FloatingSelect } from '../components/FloatingSelect';
import { DateRangePicker } from '../components/DateRangePicker';
import { toastManager } from '../components/ui/toast';


interface MyAppointmentsProps {
    onEdit: (appt: Appointment) => void;
}

export const MyAppointments: React.FC<MyAppointmentsProps> = ({ onEdit }) => {
    const { appointments } = useAppointments();
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const [copiedId, setCopiedId] = useState<string | null>(null);

    const filtered = appointments.filter(a => {
        const matchesUser = user && (a.attendantId === user.id || a.createdBy === user.id);
        if (!matchesUser) return false;

        const matchesSearch = a.lead.toLowerCase().includes(search.toLowerCase()) || a.phone.toString().includes(search) || a.email?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
        const matchesDate =
            (!dateRange.start || a.date >= dateRange.start) &&
            (!dateRange.end || a.date <= dateRange.end);
        return matchesSearch && matchesStatus && matchesDate;
    }).sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
    });

    const copyPhone = async (phone: number | string, id: string) => {
        const phoneStr = phone.toString();
        const digitsOnly = phoneStr.replace(/\D/g, '');
        try {
            await navigator.clipboard.writeText(digitsOnly);
            setCopiedId(id);
            toastManager.add({
                title: "Sucesso",
                description: "Telefone copiado com sucesso!",
                type: 'success',
            });
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            toastManager.add({
                title: "Erro",
                description: "Falha ao copiar telefone. Tente manualmente.",
                type: 'error',
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Realizado': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'Pendente': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'Cancelado': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'Reagendado': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'Esquecimento': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'Não compareceu': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-surface p-4 rounded-lg border border-border shadow-sm">
                <div className="flex-1">
                    <div className="relative">
                        <FloatingInput
                            label="Pesquisa"
                            startIcon={<Search size={18} />}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder=""
                            className="bg-background"
                        />
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 items-end">
                    <FloatingSelect
                        label="Status"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        options={[
                            { value: 'all', label: 'Todos' },
                            { value: 'Cancelado', label: 'Cancelado' },
                            { value: 'Esquecimento', label: 'Esquecimento' },
                            { value: 'Não compareceu', label: 'Não compareceu' },
                            { value: 'Pendente', label: 'Pendente' },
                            { value: 'Realizado', label: 'Realizado' },
                            { value: 'Reagendado', label: 'Reagendado' }
                        ]}
                    />
                    <DateRangePicker
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        onStartDateChange={(date) => setDateRange({ ...dateRange, start: date })}
                        onEndDateChange={(date) => setDateRange({ ...dateRange, end: date })}
                    />
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-surface rounded-lg border border-border overflow-hidden shadow-lg">
                <table className="w-full text-left">
                    <thead className="bg-[#141414] text-white text-xs uppercase tracking-wider font-bold" style={{ backgroundColor: '#141414' }}>
                        <tr>
                            <th className="px-6 py-4">Data/Hora</th>
                            <th className="px-6 py-4">Aluno(a)</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Atendente</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map(appt => (
                            <tr key={appt.id} className="hover:bg-background/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="text-foreground font-medium">{new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                                    <div className="text-sm text-secondary">{appt.time}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-foreground font-medium" title={appt.lead}>
                                        {appt.lead.length > 25 ? `${appt.lead.substring(0, 25)}...` : appt.lead}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-secondary">
                                        {appt.phone}
                                        <button
                                            onClick={() => copyPhone(appt.phone, appt.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-foreground hover:text-foreground"
                                            title="Copiar telefone"
                                        >
                                            {copiedId === appt.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground">{appt.type}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(appt.status)}`}>
                                        {appt.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground">
                                    {appt.attendantName || appt.attendantId}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => onEdit(appt)}
                                    >
                                        Detalhes
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
                {filtered.map(appt => (
                    <div key={appt.id} className="bg-surface p-4 rounded-lg border border-border shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-foreground font-semibold">{appt.lead}</h3>
                                <div className="flex items-center gap-2 text-sm text-secondary mt-1">
                                    {appt.phone}
                                    <button onClick={() => copyPhone(appt.phone, appt.id)} className="text-foreground">
                                        {copiedId === appt.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(appt.status)}`}>
                                {appt.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-secondary block text-xs">Data</span>
                                <span className="text-foreground">{new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR')} • {appt.time}</span>
                            </div>
                            <div>
                                <span className="text-secondary block text-xs">Tipo</span>
                                <span className="text-foreground">{appt.type}</span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border flex justify-end">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="w-full"
                                onClick={() => onEdit(appt)}
                            >
                                Ver Detalhes
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-12 text-secondary bg-surface rounded-lg border border-border">
                    <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Você não possui agendamentos encontrados.</p>
                </div>
            )}
        </div>
    );
};
