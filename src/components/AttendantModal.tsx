import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input as BaseInput } from './ui/Input';
import { CustomSelect } from './CustomSelect';
import { Button } from './ui/Button';
import type { Attendant } from '../types';
import { api } from '../services/api';

const Input: React.FC<any> = ({ label, ...props }) => (
    <div className="space-y-1">
        {label && <label className="block text-sm font-medium text-secondary">{label}</label>}
        <BaseInput {...props} />
    </div>
);

const Select = CustomSelect;

interface AttendantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    attendant?: Attendant | null;
}

export const AttendantModal: React.FC<AttendantModalProps> = ({ isOpen, onClose, onSuccess, attendant }) => {
    const [formData, setFormData] = useState<Partial<Attendant>>({
        name: '',
        email: '',
        sector: 'SDR',
        schedule: {
            mon: { start: '09:00', end: '18:00' },
            tue: { start: '09:00', end: '18:00' },
            wed: { start: '09:00', end: '18:00' },
            thu: { start: '09:00', end: '18:00' },
            fri: { start: '09:00', end: '18:00' },
        },
        pauses: []
    });

    useEffect(() => {
        if (attendant) {
            setFormData(attendant);
        } else {
            setFormData({
                name: '',
                email: '',
                sector: 'SDR',
                schedule: {
                    mon: { start: '09:00', end: '18:00' },
                    tue: { start: '09:00', end: '18:00' },
                    wed: { start: '09:00', end: '18:00' },
                    thu: { start: '09:00', end: '18:00' },
                    fri: { start: '09:00', end: '18:00' },
                },
                pauses: []
            });
        }
    }, [attendant, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (attendant) {
                await api.attendants.update(attendant.id, formData);
            } else {
                await api.attendants.create(formData as Omit<Attendant, 'id'>);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to save attendant', error);
        }
    };

    const updateSchedule = (day: string, field: 'start' | 'end', value: string) => {
        setFormData(prev => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [day]: { ...prev.schedule![day]!, [field]: value }
            }
        }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={attendant ? 'Editar Atendente' : 'Novo Atendente'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Nome"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    required
                />
                <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                    required
                />
                <Select
                    label="Setor"
                    value={formData.sector}
                    onChange={e => setFormData({ ...formData, sector: e.target.value as any })}
                    options={[
                        { value: 'SDR', label: 'SDR' },
                        { value: 'Closer', label: 'Closer' },
                        { value: 'Admin', label: 'Admin' }
                    ]}
                />

                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-primary">Horários de Trabalho</h4>
                    {['mon', 'tue', 'wed', 'thu', 'fri'].map(day => (
                        <div key={day} className="grid grid-cols-3 gap-2 items-center">
                            <span className="text-sm text-secondary uppercase">{day}</span>
                            <input
                                type="time"
                                className="bg-background border border-border rounded px-2 py-1 text-sm text-secondary"
                                value={formData.schedule?.[day]?.start || ''}
                                onChange={e => updateSchedule(day, 'start', e.target.value)}
                            />
                            <input
                                type="time"
                                className="bg-background border border-border rounded px-2 py-1 text-sm text-secondary"
                                value={formData.schedule?.[day]?.end || ''}
                                onChange={e => updateSchedule(day, 'end', e.target.value)}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                </div>
            </form>
        </Modal>
    );
};
