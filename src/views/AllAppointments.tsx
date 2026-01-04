import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppointments } from '../context/AppointmentContext';
import { useFormData } from '../hooks/useFormData';
import { Search, Calendar as CalendarIcon, List, Copy, Check } from 'lucide-react';
import type { Appointment } from '../types';
import { Button } from '../components/ui/button';
import { Pagination } from '../components/ui/pagination';
import { FloatingInput } from '../components/FloatingInput';
import { FloatingSelect } from '../components/FloatingSelect';
import { DateRangePicker } from '../components/DateRangePicker';
import { CalendarView } from '../components/CalendarView';
import { toastManager } from '../components/ui/toast';
import { sanitizeInput } from '../utils/security';

interface AllAppointmentsProps {
    onEdit: (appt: Appointment) => void;
}

export const AllAppointments: React.FC<AllAppointmentsProps> = ({ onEdit }) => {
    const { appointments } = useAppointments();
    const { attendants, events } = useFormData();
    const [searchParams] = useSearchParams();

    const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    // Initialize attendant filter from URL param if present
    const [attendantFilter, setAttendantFilter] = useState('all');
    const [eventFilter, setEventFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Update filter if URL param changes or attendants/events load
    useEffect(() => {
        const attendantName = searchParams.get('attendant');
        const attendantId = searchParams.get('attendantId');
        const eventName = searchParams.get('event');

        if (attendantName && attendants.length > 0) {
            const found = attendants.find(a => a.name === attendantName);
            if (found) {
                setAttendantFilter(found.id);
            }
        } else if (attendantId) {
            setAttendantFilter(attendantId);
        }

        if (eventName && events.length > 0) {
            const foundEvent = events.find(e => e.event_name === eventName);
            if (foundEvent) {
                setEventFilter(foundEvent.id);
            }
        }
    }, [searchParams, attendants, events]);

    // Filter Logic
    const filtered = appointments.filter(a => {
        const matchesSearch =
            a.lead.toLowerCase().includes(search.toLowerCase()) ||
            a.phone.toString().includes(search) ||
            a.id.includes(search);

        const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
        // Check exact match for attendant ID
        const matchesAttendant = attendantFilter === 'all' || a.attendantId === attendantFilter;
        const matchesEvent = eventFilter === 'all' || a.eventId === eventFilter;

        const matchesDate =
            (!dateRange.start || a.date >= dateRange.start) &&
            (!dateRange.end || a.date <= dateRange.end);

        return matchesSearch && matchesStatus && matchesAttendant && matchesEvent && matchesDate;
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
            {/* Controls Bar */}
            <div className="flex flex-col xl:flex-row gap-4 bg-surface p-4 rounded-lg border border-border shadow-sm">
                {/* Search */}
                <div className="flex-1 min-w-[250px]">
                    <div className="relative">
                        <FloatingInput
                            label="Pesquisa"
                            startIcon={<Search size={18} />}
                            value={search}
                            onChange={e => setSearch(sanitizeInput.search(e.target.value))}
                            placeholder=""
                            className="bg-background"
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-end">
                    {viewMode === 'table' && (
                        <FloatingSelect
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
                    )}

                    <FloatingSelect
                        label="Atendente"
                        value={attendantFilter}
                        onChange={(e: any) => setAttendantFilter(e.target.value)}
                        options={[
                            { value: 'all', label: 'Todos' },
                            ...attendants.map(att => ({ value: att.id, label: att.name }))
                        ]}
                    />

                    <FloatingSelect
                        label="Evento"
                        value={eventFilter}
                        onChange={(e: any) => setEventFilter(e.target.value)}
                        options={[
                            { value: 'all', label: 'Todos' },
                            ...events.filter(ev => ev.status === true).map(ev => ({ value: ev.id, label: ev.event_name }))
                        ]}
                    />

                    {viewMode === 'table' && (
                        <DateRangePicker
                            startDate={dateRange.start}
                            endDate={dateRange.end}
                            onStartDateChange={(date) => setDateRange({ ...dateRange, start: date })}
                            onEndDateChange={(date) => setDateRange({ ...dateRange, end: date })}
                        />
                    )}
                </div>

                {/* View Toggle & Actions */}
                <div className="flex gap-2 border-l border-border pl-4 ml-auto">
                    <div>
                        <div className="flex bg-background rounded-lg p-1 border border-border h-11 items-center">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`h-full aspect-square rounded flex items-center justify-center transition-colors ${viewMode === 'table' ? 'bg-gray-200 dark:bg-surface shadow text-black dark:text-white' : 'text-secondary hover:text-primary'}`}
                                title="Lista"
                            >
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={`h-full aspect-square rounded flex items-center justify-center transition-colors ${viewMode === 'calendar' ? 'bg-gray-200 dark:bg-surface shadow text-black dark:text-white' : 'text-secondary hover:text-primary'}`}
                                title="Calendário"
                            >
                                <CalendarIcon size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'table' ? (
                <div className="bg-surface rounded-lg border border-border overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
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
                                {paginated.map(appt => (
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
                                                Editar
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filtered.length > 0 && totalPages > 1 && (
                        <div className="p-4 border-t border-border">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <CalendarView appointments={filtered} onEditAppointment={onEdit} isSearching={!!search} />
            )}

            {filtered.length === 0 && (
                <div className="text-center py-12 text-secondary bg-surface rounded-lg border border-border">
                    <CalendarIcon size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Nenhum agendamento encontrado.</p>
                </div>
            )}
        </div>
    );
};
