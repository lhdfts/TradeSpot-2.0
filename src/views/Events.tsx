import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Event } from '../types';
import { Button } from '../components/ui/button';
import { Plus, Edit } from 'lucide-react';
import { EventModal } from '../components/EventModal';
import { ExportIcon } from '../components/ExportIcon';

import { useAuth } from '../context/AuthContext';
import { canViewAllSectors, isMedinaUser, getAllowedSectors } from '../utils/security';

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
                : user?.sector === 'Suporte'
                    ? data.filter(event => ['Tribo', 'Aldeia', 'SDR', 'Closer'].includes(event.sector || ''))
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
                alert('Não há agendamentos para exportar neste evento.');
                return;
            }

            const headers = ['Nome', 'Telefone', 'Email', 'Data', 'Horário', 'Status'];
            const csvContent = [
                headers.join(','),
                ...eventAppointments.map(app => [
                    `"${app.lead}"`,
                    `"${app.phone || ''}"`,
                    `"${app.email || ''}"`,
                    app.date,
                    app.time,
                    app.status
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
            alert('Erro ao exportar agendamentos');
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

    if (loading) return <div>Carregando...</div>;

    const canCreateEvents = ['Dev', 'Admin', 'Líder'].includes(user?.role || '') || user?.sector === 'TEI';
    const canEditEvents = ['Dev', 'Admin', 'Líder'].includes(user?.role || '');
    const canExportEvents = user?.role === 'Dev' || user?.role === 'Admin' || user?.role === 'Líder' || user?.role === 'Qualidade';
    const canManageEvents = canEditEvents || canExportEvents;

    const displayEvents = (activeTab === 'meus' 
        ? events.filter(e => {
            const matchesStatus = statusFilter === 'active' ? e.status === true : (statusFilter === 'archived' ? e.status === false : true);
            const matchesSector = sectorFilter === 'all' || e.sector === sectorFilter;
            return matchesStatus && matchesSector;
        })
        : feedEvents.filter(e => e.status === true && (sectorFilter === 'all' || e.sector === sectorFilter))
    );

    return (
        <div className="space-y-6">

            {portalContainer && canCreateEvents && createPortal(
                <Button onClick={handleAddNew}>
                    <Plus size={18} className="mr-2" /> Novo Evento
                </Button>,
                portalContainer
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {(user?.sector === 'Closer' || canViewAllSectors(user) || isMedinaUser(user) || user?.role === 'Admin' || user?.role === 'Dev') && (
                    <div className="flex gap-2 p-1 bg-muted/30 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab('meus')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'meus' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Meus Eventos
                        </button>
                        <button
                            onClick={() => setActiveTab('feeds')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'feeds' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Eventos Recebidos ({feedEvents.filter(e => e.status === true).length})
                        </button>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-4">
                    {(canViewAllSectors(user) || isMedinaUser(user)) && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Setor:</span>
                            <div className="flex gap-1 p-1 bg-muted/30 rounded-lg overflow-x-auto max-w-[300px] no-scrollbar">
                                <button
                                    onClick={() => setSectorFilter('all')}
                                    className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${sectorFilter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Todos
                                </button>
                                {getAllowedSectors(user).map(sector => (
                                    <button
                                        key={sector}
                                        onClick={() => setSectorFilter(sector)}
                                        className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${sectorFilter === sector ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {sector}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'meus' && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status:</span>
                            <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${statusFilter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setStatusFilter('active')}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${statusFilter === 'active' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Ativos
                                </button>
                                <button
                                    onClick={() => setStatusFilter('archived')}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${statusFilter === 'archived' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Arquivados
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-surface rounded-lg border border-border overflow-hidden shadow-lg">
                <table className="w-full text-left">
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
                        {displayEvents.map(event => (
                            <tr key={event.id} className="hover:bg-background/50 transition-colors">
                                <td className="px-6 py-4 text-foreground font-medium">
                                    <span
                                        onClick={() => navigateToAppointments(event.event_name)}
                                        className="cursor-pointer hover:text-primary transition-colors"
                                        title="Ver agendamentos"
                                    >
                                        {event.event_name}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-foreground">{event.sector || '-'}</td>
                                <td className="px-6 py-4 text-foreground">{event.created_at ? new Date(event.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${event.status ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                        }`}>
                                        {event.status ? 'Ativo' : 'Arquivado'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {event.self_scheduling_link && (
                                        <button
                                            onClick={() => {
                                                const url = `${window.location.origin}/agendar/${event.self_scheduling_link}`;
                                                navigator.clipboard.writeText(url);
                                                alert('Link copiado!');
                                            }}
                                            className="text-foreground hover:text-primary transition-colors"
                                            title="Copiar Link de Auto-Agendamento"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                            </svg>
                                        </button>
                                    )}
                                </td>
                                {canManageEvents && (
                                    <td className="px-6 py-4 text-center space-x-2">
                                        {canEditEvents && (
                                            <button
                                                onClick={() => handleEdit(event)}
                                                className="text-foreground hover:text-primary transition-colors"
                                                title="Editar"
                                            >
                                                <Edit size={18} />
                                            </button>
                                        )}
                                        {canExportEvents && (
                                            <button
                                                onClick={() => handleExport(event)}
                                                className="text-foreground hover:text-primary transition-colors"
                                                title="Exportar Agendamentos"
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

            <EventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchEvents}
                event={selectedEvent}
            />
        </div>
    );
};
