import React, { useState, useEffect } from 'react';
import { Modal } from './ui/modal';
import { Input as BaseInput } from './ui/input';
import { CustomSelect } from './CustomSelect';
import { Button } from './ui/button';
import type { Event } from '../types';
import { api } from '../services/api';

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
    const [formData, setFormData] = useState<Partial<Event>>({
        event_name: '',
        status: true,
        sector: ''
    });
    const [sectors, setSectors] = useState<string[]>([]);

    useEffect(() => {
        const fetchSectors = async () => {
            try {
                const attendants = await api.attendants.list();
                const uniqueSectors = Array.from(new Set(attendants.map(a => a.sector).filter(Boolean))).sort();
                setSectors(uniqueSectors);
            } catch (error) {
                console.error('Failed to fetch sectors', error);
            }
        };
        fetchSectors();
    }, []);

    useEffect(() => {
        if (event) {
            setFormData(event);
        } else {
            setFormData({
                event_name: '',
                status: true,
                sector: ''
            });
        }
    }, [event, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (event) {
                await api.events.update(event.id, formData);
            } else {
                const now = new Date();
                const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
                await api.events.create({
                    ...formData,
                    event_name: formData.event_name || '',
                    start_date: now.toISOString(),
                    end_date: oneHourLater.toISOString(),
                    status: formData.status ?? true
                } as Omit<Event, 'id'>);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to save event', error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={event ? 'Editar Evento' : 'Novo Evento'}>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                        ...sectors.map(s => ({ value: s, label: s }))
                    ]}
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

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                </div>
            </form>
        </Modal>
    );
};
