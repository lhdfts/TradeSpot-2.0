import React, { useState } from 'react';
import { useAppointments } from '../context/AppointmentContext';
import { Search, Calendar as CalendarIcon, List, Copy } from 'lucide-react';
import type { Appointment } from '../types';
import { Button } from '../components/ui/Button';
import { Pagination } from '../components/ui/Pagination';
import { CustomSelect } from '../components/CustomSelect';
import { DateRangePicker } from '../components/DateRangePicker';
import { CalendarView } from '../components/CalendarView';

interface AllAppointmentsProps {
    onEdit: (appt: Appointment) => void;
}

export const AllAppointments: React.FC<AllAppointmentsProps> = ({ onEdit }) => {
    const { appointments } = useAppointments();
    const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [attendantFilter, setAttendantFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filter Logic
    const filtered = appointments.filter(a => {
        const matchesSearch =
            a.lead.toLowerCase().includes(search.toLowerCase()) ||
            a.phone.includes(search) ||
            a.id.includes(search);

        const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
        const matchesAttendant = attendantFilter === 'all' || a.attendantId === attendantFilter;

        const matchesDate =
            (!dateRange.start || a.date >= dateRange.start) &&
            (!dateRange.end || a.date <= dateRange.end);

        return matchesSearch && matchesStatus && matchesAttendant && matchesDate;
    }).sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
    });

    // Pagination Logic
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const copyPhone = (phone: string) => {
        const digitsOnly = phone.replace(/\D/g, '');
        navigator.clipboard.writeText(digitsOnly);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Realizado': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'Pendente': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'Cancelado': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'Reagendado': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'Esquecimento': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'Não compareceu': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    return (
        <div className="space-y-6">
            {/* Controls Bar */}
            <div className="flex flex-col xl:flex-row gap-4 bg-surface p-4 rounded-lg border border-border shadow-sm">
                {/* Search */}
                {/* Search  */}
                <div className="flex-1 min-w-[250px]">
                    <label className="block text-sm font-bold text-foreground mb-1">Pesquisa</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, telefone, ID..."
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-end">
                    <CustomSelect
                        label="Status"
                        value={statusFilter}
                        onChange={(e: any) => setStatusFilter(e.target.value)}
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

                    <CustomSelect
                        label="Atendente"
                        value={attendantFilter}
                        onChange={(e: any) => setAttendantFilter(e.target.value)}
                        options={[
                            { value: 'all', label: 'Todos' },
                            { value: '1', label: 'João (SDR)' },
                            { value: '2', label: 'Ana (Closer)' }
                        ]}
                    />

                    <DateRangePicker
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        onStartDateChange={(date) => setDateRange({ ...dateRange, start: date })}
                        onEndDateChange={(date) => setDateRange({ ...dateRange, end: date })}
                    />
                </div>

                {/* View Toggle & Actions */}
                <div className="flex gap-2 border-l border-border pl-4 ml-auto">
                    <div className="flex bg-background rounded-lg p-1 border border-border">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded ${viewMode === 'table' ? 'bg-gray-200 dark:bg-surface shadow text-blue-600 dark:text-primary' : 'text-secondary hover:text-primary'}`}
                            title="Lista"
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded ${viewMode === 'calendar' ? 'bg-gray-200 dark:bg-surface shadow text-blue-600 dark:text-primary' : 'text-secondary hover:text-primary'}`}
                            title="Calendário"
                        >
                            <CalendarIcon size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'table' ? (
                <div className="bg-surface rounded-lg border border-border overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-[#070707] border-b border-white/10 text-white text-xs uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Data/Hora</th>
                                    <th className="px-6 py-4">Aluno(a)</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Atendente</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {paginated.map(appt => (
                                    <tr key={appt.id} className="hover:bg-background/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-foreground">{appt.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-foreground font-medium">{new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                                            <div className="text-sm text-secondary">{appt.time}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-foreground font-medium">{appt.lead}</div>
                                            <div className="flex items-center gap-2 text-sm text-secondary">
                                                {appt.phone}
                                                <button
                                                    onClick={() => copyPhone(appt.phone)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-foreground hover:text-foreground"
                                                    title="Copiar telefone"
                                                >
                                                    <Copy size={12} />
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
                                            {appt.attendantId === '1' ? 'João (SDR)' : 'Ana (Closer)'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => onEdit(appt)}
                                            >
                                                Editar
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-border">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>
            ) : (
                <CalendarView appointments={filtered} onEditAppointment={onEdit} />
            )}
        </div>
    );
};
