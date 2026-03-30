import React, { useState, useEffect } from 'react';
import { Modal } from './ui/modal';
import { Input as BaseInput } from './ui/input';
import { CustomSelect } from './CustomSelect';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import type { Event, Attendant } from '../types';
import { api } from '../services/api';

import { useAuth } from '../context/AuthContext';

const Input: React.FC<any> = ({ label, ...props }) => (
    <div className="space-y-1">
        {label && <label className="block text-sm font-medium text-secondary">{label}</label>}
        <BaseInput {...props} />
    </div>
);

const Select = CustomSelect;

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    event?: Event | null;
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSuccess, event }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState<Partial<Event>>({
        event_name: '',
        status: true,
        sector: '',
        duration_minutes: 60
    });

    const [attendants, setAttendants] = useState<Attendant[]>([]);
    const [allowedAttendants, setAllowedAttendants] = useState<string[]>([]);
    const [loadingAttendants, setLoadingAttendants] = useState(false);
    const [saving, setSaving] = useState(false);

    const isSuperUser = user?.role === 'Admin' || user?.role === 'Dev' || user?.role === 'Qualidade' || user?.sector === 'TEI';
    const isSuporte = user?.sector === 'Suporte';
    const canEditSector = isSuperUser || isSuporte;

    useEffect(() => {
        if (event) {
            setFormData(event);
            fetchAttendants();
        } else {
            setFormData({
                event_name: '',
                status: true,
                sector: canEditSector ? '' : (user?.sector || ''),
                duration_minutes: 60
            });
            setAttendants([]);
            setAllowedAttendants([]);
        }
    }, [event, isOpen, user, isSuperUser, isSuporte, canEditSector]);

    const fetchAttendants = async () => {
        setLoadingAttendants(true);
        try {
            const allAttendants = await api.attendants.list();
            
            // If the current user is a Closer (leader/etc), they should ONLY manage Closers
            // regardless of the event sector (could be an SDR event feeding into Closer).
            // For other sectors, show the event's sector attendants.
            let sectorAttendants: Attendant[] = [];
            
            if (user?.sector === 'Closer') {
                sectorAttendants = allAttendants.filter(a => a.sector === 'Closer');
            } else {
                sectorAttendants = allAttendants.filter(a => a.sector === formData.sector);
            }
            
            setAttendants(sectorAttendants);

            if (event) {
                // Allowed = Not in denied_events
                const allowed = sectorAttendants
                    .filter(a => !a.denied_events?.includes(event.id))
                    .map(a => a.id);
                setAllowedAttendants(allowed);
            }
        } catch (error) {
            console.error('Failed to fetch attendants', error);
        } finally {
            setLoadingAttendants(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const dataToSubmit = {
                ...formData,
                // Ensure restricted users can't override sector
                sector: canEditSector ? formData.sector : user?.sector
            };

            let savedEventId = event?.id;

            if (event) {
                await api.events.update(event.id, dataToSubmit);
            } else {
                const now = new Date();
                const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
                const newEvent = await api.events.create({
                    ...dataToSubmit,
                    event_name: dataToSubmit.event_name || '',
                    start_date: now.toISOString(),
                    end_date: oneHourLater.toISOString(),
                    status: dataToSubmit.status ?? true,
                    self_scheduling_link: dataToSubmit.self_scheduling_link || crypto.randomUUID()
                } as Omit<Event, 'id'>);
                savedEventId = newEvent.id;
            }

            // Update denied_events for all attendants in the list
            if (savedEventId) {
                const updatePromises = attendants.map(att => {
                    const isAllowed = allowedAttendants.includes(att.id);
                    let currentDenied = att.denied_events || [];
                    let newDeniedEvents = [...currentDenied];

                    if (isAllowed) {
                        // Remove from denied if it was there
                        newDeniedEvents = newDeniedEvents.filter(id => id !== savedEventId);
                    } else {
                        // Add to denied if not already there
                        if (!newDeniedEvents.includes(savedEventId)) {
                            newDeniedEvents.push(savedEventId);
                        }
                    }

                    // Only update if changed (compare strings for simple array equality)
                    const hasChanged = JSON.stringify([...newDeniedEvents].sort()) !== JSON.stringify([...currentDenied].sort());
                    
                    if (hasChanged) {
                        return api.attendants.update(att.id, { denied_events: newDeniedEvents });
                    }
                    return Promise.resolve();
                });

                await Promise.all(updatePromises);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to save event', error);
            alert('Erro ao salvar evento ou permissões de atendentes.');
        } finally {
            setSaving(false);
        }
    };

    const toggleAttendant = (id: string) => {
        setAllowedAttendants(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={event ? 'Editar Evento' : 'Novo Evento'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Tabs defaultValue="geral">
                    <TabsList className="mb-4">
                        <TabsTrigger value="geral">Geral</TabsTrigger>
                        {event && <TabsTrigger value="atendentes">Recebimento</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="geral" className="space-y-4">
                        <Input
                            label="Nome do Evento"
                            value={formData.event_name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, event_name: e.target.value })}
                            required
                            placeholder="Ex: 1125 - Cash Express"
                            className="text-foreground"
                        />

                        <Select
                            label="Setor"
                            value={formData.sector || ''}
                            onChange={(e: any) => setFormData({ ...formData, sector: e.target.value })}
                            options={[
                                { value: 'Aldeia', label: 'Aldeia' },
                                { value: 'Closer', label: 'Closer' },
                                { value: 'Perpétuos', label: 'Perpétuos' },
                                { value: 'CEO', label: 'CEO' },
                                { value: 'SDR', label: 'SDR' },
                                { value: 'Tribo', label: 'Tribo' },
                                { value: 'Social Seller', label: 'Social Seller' }
                            ]}
                            disabled={!canEditSector}
                        />

                        <Select
                            label="Status"
                            value={formData.status ? 'true' : 'false'}
                            onChange={(e: any) => setFormData({ ...formData, status: e.target.value === 'true' })}
                            options={[
                                { value: 'true', label: 'Ativo' },
                                { value: 'false', label: 'Arquivado' }
                            ]}
                        />

                        <Select
                            label="Duração do Agendamento (minutos)"
                            value={String(formData.duration_minutes || 60)}
                            onChange={(e: any) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                            options={[
                                { value: '30', label: '30 minutos' },
                                { value: '60', label: '60 minutos' }
                            ]}
                        />

                        {event && event.self_scheduling_link && (
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-secondary">Link de Auto-Agendamento</label>
                                <div className="flex gap-2">
                                    <BaseInput
                                        readOnly
                                        value={`${window.location.origin}/agendar/${event.self_scheduling_link}`}
                                        className="bg-muted text-muted-foreground"
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/agendar/${event.self_scheduling_link}`);
                                        }}
                                    >
                                        Copiar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="atendentes" className="space-y-4">
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-secondary">Atendentes que podem receber deste evento</h3>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-4 bg-muted/30">
                                {loadingAttendants ? (
                                    <div className="text-center py-4 text-muted-foreground">Carregando atendentes...</div>
                                ) : attendants.length === 0 ? (
                                    <div className="text-center py-4 text-muted-foreground">Nenhum atendente encontrado para este setor.</div>
                                ) : (
                                    attendants.map(att => (
                                        <div key={att.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors">
                                            <Checkbox
                                                id={`att-${att.id}`}
                                                checked={allowedAttendants.includes(att.id)}
                                                onCheckedChange={() => toggleAttendant(att.id)}
                                            />
                                            <label
                                                htmlFor={`att-${att.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                            >
                                                {att.name} <span className="text-xs text-muted-foreground ml-2">({att.sector})</span>
                                            </label>
                                        </div>
                                    ))
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Desmarque um atendente para que ele pare de receber agendamentos automáticos deste evento.
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
