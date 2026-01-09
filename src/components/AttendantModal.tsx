import React, { useState, useEffect } from 'react';
import { Modal } from './ui/modal';
import { Input as BaseInput } from './ui/input';
import { CustomSelect } from './CustomSelect';
import { Button } from './ui/button';
import { Plus, Trash2 } from 'lucide-react';
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
        sector: 'Suporte',
        schedule: {
            mon: { start: '09:00', end: '18:00' },
            tue: { start: '09:00', end: '18:00' },
            wed: { start: '09:00', end: '18:00' },
            thu: { start: '09:00', end: '18:00' },
            fri: { start: '09:00', end: '18:00' },
            sat: { start: '09:00', end: '18:00' },
            sun: { start: '09:00', end: '18:00' },
        },
        pauses: {
            mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: []
        }
    });

    useEffect(() => {
        if (attendant) {
            setFormData(attendant);
        } else {
            setFormData({
                name: '',
                email: '',
                sector: 'Suporte',
                schedule: {
                    mon: { start: '09:00', end: '18:00' },
                    tue: { start: '09:00', end: '18:00' },
                    wed: { start: '09:00', end: '18:00' },
                    thu: { start: '09:00', end: '18:00' },
                    fri: { start: '09:00', end: '18:00' },
                    sat: { start: '09:00', end: '18:00' },
                    sun: { start: '09:00', end: '18:00' },
                },
                pauses: {
                    mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: []
                }
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

    const addPause = (day: string) => {
        setFormData(prev => {
            const currentPauses = prev.pauses?.[day] || [];
            if (currentPauses.length >= 2) return prev;

            return {
                ...prev,
                pauses: {
                    ...prev.pauses,
                    [day]: [...currentPauses, { start: '', end: '' }]
                }
            };
        });
    };

    const removePause = (day: string, index: number) => {
        setFormData(prev => ({
            ...prev,
            pauses: {
                ...prev.pauses,
                [day]: prev.pauses?.[day]?.filter((_, i) => i !== index) || []
            }
        }));
    };

    const updatePause = (day: string, index: number, field: 'start' | 'end', value: string) => {
        setFormData(prev => {
            const currentPauses = [...(prev.pauses?.[day] || [])];
            currentPauses[index] = { ...currentPauses[index], [field]: value };

            return {
                ...prev,
                pauses: {
                    ...prev.pauses,
                    [day]: currentPauses
                }
            };
        });
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
                        { value: 'Suporte', label: 'Suporte' },
                        { value: 'Qualidade', label: 'Qualidade' },
                        { value: 'Co-Líder', label: 'Co-Líder' },
                        { value: 'Líder', label: 'Líder' },
                        { value: 'Admin', label: 'Admin' }
                    ]}
                />

                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-foreground">Horários e Pausas</h4>
                    {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                        <div key={day} className="border border-border rounded-lg p-3 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-foreground uppercase w-12">{day}</span>
                                <div className="flex gap-2 items-center flex-1">
                                    <span className="text-xs text-secondary">Trabalho:</span>
                                    <input
                                        type="time"
                                        className="bg-background border border-border rounded px-2 py-1 text-sm text-secondary w-24"
                                        value={formData.schedule?.[day]?.start || ''}
                                        onChange={e => updateSchedule(day, 'start', e.target.value)}
                                    />
                                    <span className="text-secondary">-</span>
                                    <input
                                        type="time"
                                        className="bg-background border border-border rounded px-2 py-1 text-sm text-secondary w-24"
                                        value={formData.schedule?.[day]?.end || ''}
                                        onChange={e => updateSchedule(day, 'end', e.target.value)}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addPause(day)}
                                    disabled={(formData.pauses?.[day]?.length || 0) >= 2}
                                    title={(formData.pauses?.[day]?.length || 0) >= 2 ? "Máximo de 2 pausas atingido" : "Adicionar pausa"}
                                >
                                    <Plus size={16} />
                                </Button>
                            </div>

                            {/* Pauses List */}
                            {formData.pauses?.[day]?.map((pause, index) => (
                                <div key={index} className="flex gap-2 items-center pl-16">
                                    <span className="text-xs text-secondary w-[52px]">Pausa {index + 1}:</span>
                                    <input
                                        type="time"
                                        className="bg-background border border-border rounded px-2 py-1 text-xs text-secondary w-24"
                                        value={pause.start}
                                        onChange={e => updatePause(day, index, 'start', e.target.value)}
                                    />
                                    <span className="text-xs text-secondary">-</span>
                                    <input
                                        type="time"
                                        className="bg-background border border-border rounded px-2 py-1 text-xs text-secondary w-24"
                                        value={pause.end}
                                        onChange={e => updatePause(day, index, 'end', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePause(day, index)}
                                        className="text-destructive hover:text-destructive/80 p-1"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
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
