import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { useFormData } from '../hooks/useFormData';
import { getDisplayStatus } from '../lib/appointmentStatus';
import { useNow } from '../hooks/useNow';
import type { Appointment, AppointmentDateField } from '../types';
import { metricDay } from '../utils/metricsCalc';
import { FloatingSelect } from '../components/FloatingSelect';
import { FloatingDateInput } from '../components/FloatingDateInput';
import { AppointmentsListView } from '../components/appointments/AppointmentsListView';
import { canChooseColumns, useColumnLookups, type AppointmentColumnId } from '../components/appointments/appointmentColumns';

// Colunas opcionais visíveis enquanto a pessoa não escolher outras (as de sempre desta tela).
// "Criado em" (GMT-3) vem ligada para todos os setores e cargos; quem escolhe colunas pode desligar.
const ALL_APPOINTMENTS_DEFAULT_COLUMNS: AppointmentColumnId[] = ['createdAt', 'type', 'owner', 'attendant'];
import { STATUS_FILTER_OPTIONS, FILTER_WIDTH } from '../constants/appointmentStatus';
import { sanitizeInput, canViewAllSectors, isMedinaUser, getAllowedSectors, isDualLeader } from '../utils/security';
import { CONTACT_CHANNEL_FILTER_OPTIONS, matchesContactChannel } from '../constants/sectors';

interface AllAppointmentsProps {
    onEdit: (appt: Appointment) => void;
}

const getBrazilTodayISO = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(new Date()); // YYYY-MM-DD no fuso de Brasília
};

export const AllAppointments: React.FC<AllAppointmentsProps> = ({ onEdit }) => {
    const { appointments, refresh, truncated, loading: loadingAppointments, loaded } = useAppointments();
    const { attendants, events } = useFormData();
    const columnLookups = useColumnLookups(attendants, events);
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.role === 'Colaborador' && user?.sector === 'Closer') {
            navigate('/');
        }
    }, [user, navigate]);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    // Status "Iniciando"/"Ao Vivo" dependem da hora; atualiza nas viradas de 5 min.
    const now = useNow();
    // Initialize attendant filter from URL param if present
    const [attendantFilter, setAttendantFilter] = useState('all');
    const [creatorFilter, setCreatorFilter] = useState('all');
    const [ownerFilter, setOwnerFilter] = useState('all');
    const [eventFilter, setEventFilter] = useState('all');
    const [sectorFilter, setSectorFilter] = useState('all');
    const [contactChannelFilter, setContactChannelFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: getBrazilTodayISO(), end: '' });
    // Período pela data do agendamento ou pela data de criação (GMT-3), como nas Métricas.
    const [dateBasis, setDateBasis] = useState<AppointmentDateField>('date');
    // Dia que conta para o período; sem data de criação, fica fora no modo por criação.
    const dayOf = (a: Appointment) => metricDay(a, dateBasis) ?? '';
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Solução 1 (Recomendada - Filtro de Data no Backend):
    // Busca do Supabase exatamente os agendamentos do período selecionado, antes dos limites de linhas
    useEffect(() => {
        refresh({
            startDate: dateRange.start || undefined,
            endDate: dateRange.end || undefined,
            dateField: dateBasis
        });
    }, [dateRange.start, dateRange.end, dateBasis]);

    const filteredAttendants = (user?.sector === 'TEI' || user?.role === 'Admin' || user?.role === 'Dev' || user?.role === 'Qualidade'
        ? attendants
        : attendants.filter(att => att.sector === user?.sector))
        .sort((a, b) => a.name.localeCompare(b.name));

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

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter, attendantFilter, creatorFilter, ownerFilter, eventFilter, sectorFilter, contactChannelFilter, dateRange, dateBasis]);

    // Events that had at least 1 appointment within the selected period (Data Inicial/Data Final),
    // used to restrict the options shown in the "Evento" filter.
    const eventIdsInDateRange = new Set(
        appointments
            .filter(a => {
                let matchesDateForEvent;
                if (!dateRange.start && !dateRange.end) {
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    const safeTodayStr = `${yyyy}-${mm}-${dd}`;
                    matchesDateForEvent = dayOf(a) >= safeTodayStr;
                } else {
                    matchesDateForEvent =
                        (!dateRange.start || dayOf(a) >= dateRange.start) &&
                        (!dateRange.end || dayOf(a) <= dateRange.end);
                }

                if (!matchesDateForEvent) return false;

                const linkedAttendant = attendants.find(att => att.id === a.attendantId);
                const linkedEvent = events.find(e => e.id === a.eventId);
                const creatorUser = attendants.find(att => att.id === a.createdBy);
                const allowedSectors = getAllowedSectors(user);
                const isGlobalViewer = canViewAllSectors(user);

                return isGlobalViewer ||
                    (linkedAttendant && linkedAttendant.sector && allowedSectors.includes(linkedAttendant.sector)) ||
                    (linkedEvent && linkedEvent.sector && allowedSectors.includes(linkedEvent.sector)) ||
                    (creatorUser && creatorUser.sector && allowedSectors.includes(creatorUser.sector)) ||
                    (a.attendantId === user?.id) ||
                    (a.createdBy === user?.id) ||
                    (a.ownerId === user?.id);
            })
            .map(a => a.eventId)
    );

    // Keep the currently selected event selectable even if it has no appointments in range
    const eventOptions = events.filter(ev =>
        ev.status === true && (eventIdsInDateRange.has(ev.id) || ev.id === eventFilter)
    );

    // Filter Logic
    const filtered = appointments.filter(a => {
        const matchesSearch =
            a.lead.toLowerCase().includes(search.toLowerCase()) ||
            a.phone.toString().includes(search) ||
            a.id.includes(search) ||
            a.email?.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'all' || getDisplayStatus(a, now) === statusFilter;

        const matchesAttendant = attendantFilter === 'all' || a.attendantId === attendantFilter;

        const matchesCreator = creatorFilter === 'all' || (a.createdBy && a.createdBy === creatorFilter);

        const matchesOwner = ownerFilter === 'all' || (a.ownerId ?? a.createdBy) === ownerFilter;

        const matchesEvent = eventFilter === 'all' || a.eventId === eventFilter;

        const matchesChannel = matchesContactChannel(a.contactChannel, contactChannelFilter);

        const matchesSectorFilter = sectorFilter === 'all' || (() => {
            const linkedAttendant = attendants.find(att => att.id === a.attendantId);
            return linkedAttendant?.sector === sectorFilter;
        })();

        // Updated: If searching, IGNORE date filter (Global Search)
        let matchesDate = true;

        if (search) {
            matchesDate = true;
        } else {
            if (!dateRange.start && !dateRange.end) {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const safeTodayStr = `${yyyy}-${mm}-${dd}`;

                matchesDate = dayOf(a) >= safeTodayStr;
            } else {
                matchesDate =
                    (!dateRange.start || dayOf(a) >= dateRange.start) &&
                    (!dateRange.end || dayOf(a) <= dateRange.end);
            }
        }

        // Sector restrictions (Fixed for Medina and TEI)
        const allowedSectors = getAllowedSectors(user);
        const isGlobalViewer = canViewAllSectors(user);
        
        const linkedAttendant = attendants.find(att => att.id === a.attendantId);
        const linkedEvent = events.find(e => e.id === a.eventId);
        const creatorUser = attendants.find(att => att.id === a.createdBy);

        const matchesSector = isGlobalViewer ||
            (linkedAttendant && linkedAttendant.sector && allowedSectors.includes(linkedAttendant.sector)) ||
            (linkedEvent && linkedEvent.sector && allowedSectors.includes(linkedEvent.sector)) ||
            (creatorUser && creatorUser.sector && allowedSectors.includes(creatorUser.sector)) ||
            (a.attendantId === user?.id) ||
            (a.createdBy === user?.id) ||
            (a.ownerId === user?.id);

        return matchesSearch && matchesStatus && matchesAttendant && matchesCreator && matchesOwner && matchesEvent && matchesChannel && matchesSectorFilter && matchesDate && matchesSector;
    }).sort((a, b) => {
        // Por criação: na ordem em que foram criados. Senão, os mais próximos primeiro.
        if (dateBasis === 'created') {
            return (Date.parse(a.createdAt ?? '') || 0) - (Date.parse(b.createdAt ?? '') || 0);
        }
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime(); // Ascending for closest appointments first
    });

    const hasActiveFilters =
        search !== '' || statusFilter !== 'all' || attendantFilter !== 'all' || creatorFilter !== 'all' ||
        ownerFilter !== 'all' || eventFilter !== 'all' || sectorFilter !== 'all' || contactChannelFilter !== 'all' ||
        dateRange.start !== getBrazilTodayISO() || dateRange.end !== '' || dateBasis !== 'date';

    const advancedActiveCount = [
        creatorFilter !== 'all', ownerFilter !== 'all', sectorFilter !== 'all',
        attendantFilter !== 'all', eventFilter !== 'all', contactChannelFilter !== 'all', dateRange.end !== '',
    ].filter(Boolean).length;

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('all');
        setAttendantFilter('all');
        setCreatorFilter('all');
        setOwnerFilter('all');
        setEventFilter('all');
        setSectorFilter('all');
        setContactChannelFilter('all');
        setDateRange({ start: getBrazilTodayISO(), end: '' });
        setDateBasis('date');
    };

    if (user?.role === 'Colaborador' && user?.sector === 'Closer') {
        return <Navigate to="/" replace />;
    }

    const attendantOptions = [
        { value: 'all', label: 'Todos' },
        ...filteredAttendants.map(att => ({ value: att.id, label: att.name }))
    ];

    return (
        <AppointmentsListView
            appointments={filtered}
            loading={loadingAppointments}
            loaded={loaded}
            truncated={truncated}
            search={search}
            onSearchChange={value => setSearch(sanitizeInput.search(value))}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            page={currentPage}
            onPageChange={setCurrentPage}
            pageSize={itemsPerPage}
            defaultColumns={ALL_APPOINTMENTS_DEFAULT_COLUMNS}
            columnsStorageKey={`todos-agendamentos:${user?.id ?? ''}`}
            canChooseColumns={canChooseColumns(user?.role)}
            columnLookups={columnLookups}
            actionLabel="Editar"
            onOpen={onEdit}
            onCreate={() => navigate('/create-appointment')}
            emptyDescription="Quando houver agendamentos no seu setor, eles aparecem aqui."
            primaryFilters={viewMode => viewMode === 'table' && (
                <>
                    <FloatingSelect
                        label="Status"
                        className={FILTER_WIDTH}
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        options={STATUS_FILTER_OPTIONS}
                    />
                    <FloatingSelect
                        label="Período por"
                        className={FILTER_WIDTH}
                        value={dateBasis}
                        onChange={e => setDateBasis(e.target.value as AppointmentDateField)}
                        options={[
                            { value: 'date', label: 'Data do agendamento' },
                            { value: 'created', label: 'Data de criação' }
                        ]}
                    />
                    <FloatingDateInput
                        label="Data Inicial"
                        className={FILTER_WIDTH}
                        value={dateRange.start}
                        onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                </>
            )}
            advancedActiveCount={advancedActiveCount}
            advancedFilters={viewMode => (
                <>
                    <FloatingSelect
                        label="Criador"
                        className={FILTER_WIDTH}
                        value={creatorFilter}
                        onChange={e => setCreatorFilter(e.target.value)}
                        options={attendantOptions}
                    />
                    <FloatingSelect
                        label="Responsável"
                        className={FILTER_WIDTH}
                        value={ownerFilter}
                        onChange={e => setOwnerFilter(e.target.value)}
                        options={attendantOptions}
                    />
                    {(canViewAllSectors(user) || isMedinaUser(user) || isDualLeader(user)) && (
                        <FloatingSelect
                            label="Setor"
                            className={FILTER_WIDTH}
                            value={sectorFilter}
                            onChange={e => setSectorFilter(e.target.value)}
                            options={[
                                { value: 'all', label: 'Todos' },
                                ...getAllowedSectors(user).map(s => ({ value: s, label: s }))
                            ]}
                        />
                    )}
                    <FloatingSelect
                        label="Atendente"
                        className={FILTER_WIDTH}
                        value={attendantFilter}
                        onChange={e => setAttendantFilter(e.target.value)}
                        options={attendantOptions}
                    />
                    <FloatingSelect
                        label="Evento"
                        className={FILTER_WIDTH}
                        value={eventFilter}
                        onChange={e => setEventFilter(e.target.value)}
                        options={[
                            { value: 'all', label: 'Todos' },
                            ...eventOptions.map(ev => ({ value: ev.id, label: ev.event_name }))
                        ]}
                    />
                    <FloatingSelect
                        label="Meio de Contato"
                        className={FILTER_WIDTH}
                        value={contactChannelFilter}
                        onChange={e => setContactChannelFilter(e.target.value)}
                        options={CONTACT_CHANNEL_FILTER_OPTIONS}
                    />
                    {viewMode === 'table' && (
                        <FloatingDateInput
                            label="Data Final"
                            className={FILTER_WIDTH}
                            value={dateRange.end}
                            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                        />
                    )}
                </>
            )}
        />
    );
};
