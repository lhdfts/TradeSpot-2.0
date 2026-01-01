import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Event } from '../types';
import { Button } from '../components/ui/Button';
import { Plus, Edit } from 'lucide-react';
import { EventModal } from '../components/EventModal';
import { ExportIcon } from '../components/ExportIcon';

export const Events: React.FC = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<Event[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalContainer(document.getElementById('header-actions'));
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const data = await api.events.list();
            setEvents(data);
        } catch (error) {
            console.error('Failed to fetch events', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

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

    return (
        <div className="space-y-6">

            {portalContainer && createPortal(
                <Button onClick={handleAddNew}>
                    <Plus size={18} className="mr-2" /> Novo Evento
                </Button>,
                portalContainer
            )}

            <div className="bg-surface rounded-lg border border-border overflow-hidden shadow-lg">
                <table className="w-full text-left">
                    <thead className="bg-[#141414] text-white text-xs uppercase tracking-wider font-bold" style={{ backgroundColor: '#141414' }}>
                        <tr>
                            <th className="px-6 py-4">Nome do Evento</th>
                            <th className="px-6 py-4">Data de Criação</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {events.map(event => (
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
                                <td className="px-6 py-4 text-foreground">{event.created_at ? new Date(event.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${event.status ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                        }`}>
                                        {event.status ? 'Ativo' : 'Arquivado'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center space-x-2">
                                    <button
                                        onClick={() => handleEdit(event)}
                                        className="text-foreground hover:text-primary transition-colors"
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleExport(event)}
                                        className="text-foreground hover:text-primary transition-colors"
                                        title="Exportar Agendamentos"
                                    >
                                        <ExportIcon size={18} />
                                    </button>

                                </td>
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
