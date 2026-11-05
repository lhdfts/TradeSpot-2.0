import React, { useState, useEffect } from 'react';
import { LoadingState } from '../components/ui/loading-state';
import { staggerStyle } from '../lib/motion';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Event } from '../types';
import { Button } from '../components/ui/button';
import { FloatingSelect } from '../components/FloatingSelect';
import { FloatingInput } from '../components/FloatingInput';
import { Plus, Edit, CalendarRange, SearchX } from 'lucide-react';
import { EventModal } from '../components/EventModal';
import { ExportIcon } from '../components/ExportIcon';
import { notify } from '../components/ui/notify';
import { EmptyState } from '../components/ui/empty-state';
import { cn } from '../lib/utils';

import { useAuth } from '../context/AuthContext';
import { canViewAllSectors, isMedinaUser, getAllowedSectors, escapeCsvValue, isDualLeader } from '../utils/security';

export const Events: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [feedEvents, setFeedEvents] = useState<Event[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
    const [activeTab, setActiveTab] = useState<'meus' | 'feeds'>('meus');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
    const [sectorFilter, setSectorFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');

    useEffect(() => {
        setPortalContainer(document.getElementById('header-actions'));
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const data = await api.events.list();

            // Filter events based on role/sector (Medina and TEI logic)
            const allowedSectors = getAllowedSectors(user);
            const isSuperUser = canViewAllSectors(user) || user?.role === 'Admin' || user?.role === 'Dev' || user?.role === 'Qualidade';

            const filteredData = isSuperUser || isMedinaUser(user)
                ? data.filter(event => allowedSectors.includes(event.sector || ''))
                : data.filter(event => event.sector === user?.sector);

            setEvents(filteredData);

            // If Closer or Medina or TEI, also fetch feeds
            if (user?.sector === 'Closer' || isSuperUser || isMedinaUser(user)) {
                const feeds = await api.events.listFeeds(user?.sector === 'Closer' ? 'Closer' : 'Closer');
                // Only show feeds that are NOT in the regular list to avoid duplicates
                const regularIds = filteredData.map(e => e.id);
                setFeedEvents(feeds.filter(f => !regularIds.includes(f.id)));
            }
        } catch (error) {
            console.error('Failed to fetch events', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchEvents();
        }
    }, [user]);

    const handleEdit = (event: Event) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };



    const handleExport = async (event: Event) => {
        try {
            setLoading(true);
            const allAppointments = await api.appointments.list();
            const eventAppointments = allAppointments.filter(app => app.eventId === event.id);

            if (eventAppointments.length === 0) {
                notify.error(`${event.event_name} ainda não tem agendamentos.`, 'Não há nada para exportar. Compartilhe o link de auto-agendamento para receber os primeiros.');
                return;
            }

            const headers = ['Nome', 'Telefone', 'Email', 'Data', 'Horário', 'Status'];
            const csvContent = [
                headers.join(','),
                ...eventAppointments.map(app => [
                    escapeCsvValue(app.lead),
                    escapeCsvValue(app.phone),
                    escapeCsvValue(app.email),
                    escapeCsvValue(app.date),
                    escapeCsvValue(app.time),
                    escapeCsvValue(app.status)
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `${event.event_name}_agendamentos.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Failed to export', error);
            notify.error('Não foi possível exportar os agendamentos.', 'Verifique a conexão e tente de novo.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNew = () => {
        setSelectedEvent(null);
        setIsModalOpen(true);
    };

    const navigateToAppointments = (eventName: string) => {
        navigate(`/all-appointments?event=${encodeURIComponent(eventName)}`);
    };

    if (loading) return <LoadingState />;

    const canCreateEvents = ['Dev', 'Admin', 'Líder'].includes(user?.role || '') || user?.sector === 'TEI';
    const canEditEvents = ['Dev', 'Admin', 'Líder'].includes(user?.role || '');
    const canExportEvents = user?.role === 'Dev' || user?.role === 'Admin' || user?.role === 'Líder' || user?.role === 'Qualidade';
    const canManageEvents = canEditEvents || canExportEvents;

    const displayEvents = (activeTab === 'meus' 
        ? events.filter(e => {
            const matchesStatus = statusFilter === 'active' ? e.status === true : (statusFilter === 'archived' ? e.status === false : true);
            const matchesSector = sectorFilter === 'all' || e.sector === sectorFilter;
            const matchesSearch = !searchTerm.trim() || 
                e.event_name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesSector && matchesSearch;
        })
        : feedEvents.filter(e => {
            const matchesSector = sectorFilter === 'all' || e.sector === sectorFilter;
            const matchesSearch = !searchTerm.trim() || 
                e.event_name.toLowerCase().includes(searchTerm.toLowerCase());
            return e.status === true && matchesSector && matchesSearch;
        })
    );

    return (
        <div className="space-y-6">

            {portalContainer && canCreateEvents && createPortal(
                // No celular só o ícone, para caber ao lado do título
                <Button onClick={handleAddNew} aria-label="Novo evento" title="Novo evento" className="px-2.5 sm:px-4">
                    <Plus size={18} className="sm:mr-2" /><span className="hidden sm:inline">Novo evento</span>
                </Button>,
                portalContainer
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {(user?.sector === 'Closer' || canViewAllSectors(user) || isMedinaUser(user) || user?.role === 'Admin' || user?.role === 'Dev' || isDualLeader(user)) && (
                    <div className="flex gap-2 p-1 bg-muted/30 rounded-lg w-full sm:w-fit">
                        <button
                            type="button"
                            aria-pressed={activeTab === 'meus'}
                            onClick={() => setActiveTab('meus')}
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${activeTab === 'meus' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Meus Eventos
                        </button>
                        <button
                            type="button"
                            aria-pressed={activeTab === 'feeds'}
                            onClick={() => setActiveTab('feeds')}
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${activeTab === 'feeds' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Eventos Recebidos ({feedEvents.filter(e => e.status === true).length})
                        </button>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-4">
                    <div className="w-full sm:w-64">
                        <FloatingInput
                            label="Pesquisar por nome"
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {(canViewAllSectors(user) || isMedinaUser(user) || isDualLeader(user)) && (
                        <FloatingSelect
                            label="Setor"
                            value={sectorFilter}
                            onChange={(e: any) => setSectorFilter(e.target.value)}
                            options={[
                                { value: 'all', label: 'Todos os Setores' },
                                ...getAllowedSectors(user).map(sector => ({ value: sector, label: sector }))
                            ]}
                            className="flex-1 min-w-[9rem] sm:flex-none sm:w-48"
                        />
                    )}

                    {activeTab === 'meus' && (
                        <FloatingSelect
                            label="Status"
                            value={statusFilter}
                            onChange={(e: any) => setStatusFilter(e.target.value as any)}
                            options={[
                                { value: 'all', label: 'Todos' },
                                { value: 'active', label: 'Ativos' },
                                { value: 'archived', label: 'Arquivados' }
                            ]}
                            className="flex-1 min-w-[9rem] sm:flex-none sm:w-40"
                        />
                    )}
                </div>
            </div>

            {displayEvents.length === 0 ? (
                searchTerm.trim() || sectorFilter !== 'all' || (activeTab === 'meus' && statusFilter !== 'all') ? (
                    <EmptyState
                        icons={[SearchX]}
                        title="Nenhum evento com esses filtros"
                        description={searchTerm.trim() ? `Nada encontrado para "${searchTerm}". Confira a grafia.` : 'Tente outro setor ou status.'}
                        action={{ label: 'Limpar filtros', onClick: () => { setSearchTerm(''); setSectorFilter('all'); setStatusFilter('all'); } }}
                    />
                ) : activeTab === 'feeds' ? (
                    <EmptyState
                        icons={[CalendarRange]}
                        title="Nenhum evento recebido"
                        description="Eventos ativos que outros setores direcionam para o Closer aparecem aqui."
                    />
                ) : (
                    <EmptyState
                        icons={[CalendarRange]}
                        title="Nenhum evento ainda"
                        description="Eventos agrupam agendamentos e geram um link de auto-agendamento para os alunos."
                        action={canCreateEvents ? { label: 'Novo evento', icon: Plus, onClick: handleAddNew } : undefined}
                    />
                )
            ) : (
            <div style={staggerStyle(0, 80)} className="animate-fade-up bg-surface rounded-lg border border-border overflow-hidden shadow-sm">
                {/* Rolagem horizontal em telas pequenas para não cortar colunas */}
                <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[760px]">
                    <thead className="bg-[#141414] text-white text-xs uppercase tracking-wider font-bold" style={{ backgroundColor: '#141414' }}>
                        <tr>
                            <th className="px-6 py-4">Nome do Evento</th>
                            <th className="px-6 py-4">Setor</th>
                            <th className="px-6 py-4">Data de Criação</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-center">Link</th>
                            {canManageEvents && (<th className="px-6 py-4 text-center">Ações</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {displayEvents.map((event, i) => (
                            <tr style={staggerStyle(i, 30)} key={event.id} className="animate-fade-up hover:bg-background/50 transition-colors">
                                <td className="px-6 py-4 text-foreground font-medium">
                                    <button
                                        type="button"
                                        onClick={() => navigateToAppointments(event.event_name)}
                                        className="text-left hover:text-primary hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
                                        title="Ver agendamentos"
                                        aria-label={`Ver agendamentos de ${event.event_name}`}
                                    >
                                        {event.event_name}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-foreground">{event.sector || '-'}</td>
                                <td className="px-6 py-4 text-foreground whitespace-nowrap">{event.created_at ? new Date(event.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                                <td className="px-6 py-4">
                                    <span className={cn('px-2 py-1 rounded-full text-xs font-semibold border', event.status
                                        ? 'bg-status-realizado/10 text-status-realizado border-status-realizado/25'
                                        : 'bg-muted text-muted-foreground border-border')}>
                                        {event.status ? 'Ativo' : 'Arquivado'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {event.self_scheduling_link && (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const url = `${window.location.origin}/agendar/${event.self_scheduling_link}`;
                                                try {
                                                    await navigator.clipboard.writeText(url);
                                                    notify.success('Link copiado', `Link de auto-agendamento de ${event.event_name}.`);
                                                } catch {
                                                    notify.error('Não foi possível copiar o link.', 'Permita o acesso à área de transferência no navegador e tente de novo.');
                                                }
                                            }}
                                            className="inline-flex p-1.5 rounded-md text-foreground hover:text-primary transition-colors"
                                            title="Copiar link de auto-agendamento"
                                            aria-label={`Copiar link de auto-agendamento de ${event.event_name}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                            </svg>
                                        </button>
                                    )}
                                </td>
                                {canManageEvents && (
                                    <td className="px-6 py-4 text-center whitespace-nowrap space-x-1">
                                        {canEditEvents && (
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(event)}
                                                className="inline-flex p-1.5 rounded-md text-foreground hover:text-primary transition-colors"
                                                title="Editar evento"
                                                aria-label={`Editar evento ${event.event_name}`}
                                            >
                                                <Edit size={18} />
                                            </button>
                                        )}
                                        {canExportEvents && (
                                            <button
                                                type="button"
                                                onClick={() => handleExport(event)}
                                                className="inline-flex p-1.5 rounded-md text-foreground hover:text-primary transition-colors"
                                                title="Exportar agendamentos"
                                                aria-label={`Exportar agendamentos de ${event.event_name}`}
                                            >
                                                <ExportIcon size={18} />
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
            )}

            <EventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchEvents}
                event={selectedEvent}
            />
        </div>
    );
};
