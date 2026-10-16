import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import type { Appointment } from '../types';
import { FloatingSelect } from '../components/FloatingSelect';
import { FloatingDateInput } from '../components/FloatingDateInput';
import { AppointmentsListView } from '../components/appointments/AppointmentsListView';
import { STATUS_FILTER_OPTIONS, FILTER_WIDTH } from '../constants/appointmentStatus';
import { brazilTodayISO } from '../lib/dates';
import { useFormData } from '../hooks/useFormData';
import { getDisplayStatus } from '../lib/appointmentStatus';
import { useNow } from '../hooks/useNow';

interface MyAppointmentsProps {
    onEdit: (appt: Appointment) => void;
}

export const MyAppointments: React.FC<MyAppointmentsProps> = ({ onEdit }) => {
    const { appointments, refresh, truncated, loading, loaded } = useAppointments();
    const { user } = useAuth();
    const { events } = useFormData();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    // Status "Iniciando"/"Ao Vivo" dependem da hora; atualiza nas viradas de 5 min.
    const now = useNow();
    const [eventFilter, setEventFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: brazilTodayISO(), end: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Busca no servidor só o período escolhido (igual a Todos os Agendamentos).
    useEffect(() => {
        refresh({
            startDate: dateRange.start || undefined,
            endDate: dateRange.end || undefined
        });
    }, [dateRange.start, dateRange.end]);

    // "Meus" = sou o atendente ou o owner. Quando o Líder passa o agendamento
    // para outro owner, ele some daqui para o criador.
    const optionsBaseAppointments = React.useMemo(() => {
        return appointments.filter(a => {
            if (!user) return false;
            return a.attendantId === user.id || (a.ownerId ?? a.createdBy) === user.id;
        });
    }, [appointments, user]);

    const eventOptions = React.useMemo(() => {
        const ids = Array.from(new Set(optionsBaseAppointments.map(a => a.eventId).filter((v): v is string => !!v)));
        ids.sort((a, b) => {
            const nameA = events.find(e => e.id === a)?.event_name || a;
            const nameB = events.find(e => e.id === b)?.event_name || b;
            return nameA.localeCompare(nameB);
        });

        return [
            { value: 'all', label: 'Todos' },
            ...ids.map(id => ({
                value: id,
                label: events.find(e => e.id === id)?.event_name || id
            }))
        ];
    }, [events, optionsBaseAppointments]);

    const typeOptions = React.useMemo(() => {
        const types = Array.from(new Set(optionsBaseAppointments.map(a => a.type)));
        types.sort((a, b) => a.localeCompare(b));
        return [
            { value: 'all', label: 'Todos' },
            ...types.map(t => ({ value: t, label: t }))
        ];
    }, [optionsBaseAppointments]);

    const filtered = appointments.filter(a => {
        const matchesUser = user && (a.attendantId === user.id || (a.ownerId ?? a.createdBy) === user.id);
        if (!matchesUser) return false;

        const cleanSearch = search.replace(/\D/g, '');
        const matchesSearch =
            a.lead.toLowerCase().includes(search.toLowerCase()) ||
            (cleanSearch ? a.phone.toString().replace(/\D/g, '').includes(cleanSearch) : false) ||
            a.phone.toString().includes(search) ||
            a.email?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || getDisplayStatus(a, now) === statusFilter;
        const matchesEvent = eventFilter === 'all' || a.eventId === eventFilter;
        const matchesType = typeFilter === 'all' || a.type === typeFilter;

        // Default: Show Only Today and Future
        // If filters are empty, we hide past appointments (yesterday or older).
        // If filters are present, we respect them.
        let matchesDate = true;

        // Updated: If searching, IGNORE date filter
        if (search) {
            matchesDate = true;
        } else if (dateRange.start || dateRange.end) {
            matchesDate =
                (!dateRange.start || a.date >= dateRange.start) &&
                (!dateRange.end || a.date <= dateRange.end);
        } else {
            // Default: Show Only Today and Future
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const safeTodayStr = `${yyyy}-${mm}-${dd}`;
            matchesDate = a.date >= safeTodayStr;
        }

        return matchesSearch && matchesStatus && matchesEvent && matchesType && matchesDate;
    }).sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
    });

    const hasActiveFilters =
        search !== '' || statusFilter !== 'all' || eventFilter !== 'all' || typeFilter !== 'all' ||
        dateRange.start !== brazilTodayISO() || dateRange.end !== '';

    const advancedActiveCount =
        [eventFilter !== 'all', typeFilter !== 'all', dateRange.end !== ''].filter(Boolean).length;

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('all');
        setEventFilter('all');
        setTypeFilter('all');
        setDateRange({ start: brazilTodayISO(), end: '' });
        setCurrentPage(1);
    };

    return (
        <AppointmentsListView
            appointments={filtered}
            loading={loading}
            loaded={loaded}
            truncated={truncated}
            search={search}
            onSearchChange={value => {
                setSearch(value);
                setCurrentPage(1);
            }}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            page={currentPage}
            onPageChange={setCurrentPage}
            pageSize={itemsPerPage}
            actionLabel="Detalhes"
            onOpen={onEdit}
            onCreate={() => navigate('/create-appointment')}
            emptyDescription="Os agendamentos em que você é atendente ou responsável aparecem aqui."
            primaryFilters={viewMode => viewMode === 'table' && (
                <>
                    <FloatingSelect
                        label="Status"
                        className={FILTER_WIDTH}
                        value={statusFilter}
                        onChange={e => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        options={STATUS_FILTER_OPTIONS}
                    />
                    <FloatingDateInput
                        label="Data Inicial"
                        className={FILTER_WIDTH}
                        value={dateRange.start}
                        onChange={e => {
                            setDateRange({ ...dateRange, start: e.target.value });
                            setCurrentPage(1);
                        }}
                    />
                </>
            )}
            advancedActiveCount={advancedActiveCount}
            advancedFilters={viewMode => (
                <>
                    <FloatingSelect
                        label="Evento"
                        className={FILTER_WIDTH}
                        value={eventFilter}
                        onChange={e => {
                            setEventFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        options={eventOptions}
                    />
                    <FloatingSelect
                        label="Tipo"
                        className={FILTER_WIDTH}
                        value={typeFilter}
                        onChange={e => {
                            setTypeFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        options={typeOptions}
                    />
                    {viewMode === 'table' && (
                        <FloatingDateInput
                            label="Data Final"
                            className={FILTER_WIDTH}
                            value={dateRange.end}
                            onChange={e => {
                                setDateRange({ ...dateRange, end: e.target.value });
                                setCurrentPage(1);
                            }}
                        />
                    )}
                </>
            )}
        />
    );
};
