import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Event } from '../types';
import { Button } from '../components/ui/Button';
import { Plus, Edit, Trash2, Archive } from 'lucide-react';
import { EventModal } from '../components/EventModal';

export const Events: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);

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

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este evento?')) {
            await api.events.delete(id);
            fetchEvents();
        }
    };

    const handleToggleArchive = async (event: Event) => {
        const newStatus = event.status === 'Active' ? 'Archived' : 'Active';
        await api.events.update(event.id, { status: newStatus });
        fetchEvents();
    };

    const handleAddNew = () => {
        setSelectedEvent(null);
        setIsModalOpen(true);
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-surface p-4 rounded-lg border border-border shadow-sm">
                <h2 className="text-lg font-semibold text-foreground">Gerenciar Eventos</h2>
                <Button onClick={handleAddNew}>
                    <Plus size={18} className="mr-2" /> Novo Evento
                </Button>
            </div>

            <div className="bg-surface rounded-lg border border-border overflow-hidden shadow-lg">
                <table className="w-full text-left">
                    <thead className="bg-[##141414] text-white text-xs uppercase tracking-wider font-bold">
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
                                <td className="px-6 py-4 text-foreground font-medium">{event.event_name}</td>
                                <td className="px-6 py-4 text-foreground">{event.created_at ? new Date(event.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${event.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                        }`}>
                                        {event.status === 'Active' ? 'Ativo' : 'Arquivado'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center space-x-2">
                                    <button
                                        onClick={() => handleToggleArchive(event)}
                                        className="text-foreground hover:text-warning transition-colors"
                                        title={event.status === 'Active' ? 'Arquivar' : 'Desarquivar'}
                                    >
                                        <Archive size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(event)}
                                        className="text-foreground hover:text-primary transition-colors"
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(event.id)}
                                        className="text-foreground hover:text-danger transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={18} />
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
