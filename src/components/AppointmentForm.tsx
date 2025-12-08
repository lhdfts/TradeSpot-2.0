import React, { useState, useEffect } from 'react';
import { CustomSelect } from './CustomSelect';
import { Button } from './ui/Button';
import { FloatingDateInput } from './FloatingDateInput';
import { TimePickerInput } from './TimePickerInput';
import { useAppointments } from '../context/AppointmentContext';
import { useFormData } from '../hooks/useFormData';
import { APPOINTMENT_STATUSES } from '../types';
import type { Appointment, AppointmentType, ProfileLevel, KnowledgeLevel, AppointmentStatus } from '../types';
import { findAvailableCloser } from '../utils/distribution';

// Wrapper for Input with label support
const Input: React.FC<any> = ({ label, className, ...props }) => (
    <div className="space-y-1">
        {label && <label className="block text-sm font-bold text-foreground">{label}</label>}
        <input
            className={`w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all ${className || ''}`}
            {...props}
        />
    </div>
);

// Wrapper for Select
const Select = CustomSelect;

interface AppointmentFormProps {
    initialData?: Appointment | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({ initialData, onSuccess, onCancel }) => {
    const { createAppointment, updateAppointment, appointments } = useAppointments();
    const { attendants, events, loading } = useFormData();
    const [rates, setRates] = useState<Record<string, number>>({});

    useEffect(() => {
        fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,JPY-BRL')
            .then(res => res.json())
            .then(data => {
                setRates({
                    USD: parseFloat(data.USDBRL.bid),
                    EUR: parseFloat(data.EURBRL.bid),
                    JPY: parseFloat(data.JPYBRL.bid)
                });
            })
            .catch(err => console.error('Failed to fetch rates', err));
    }, []);

    const [formData, setFormData] = useState({
        lead: '',
        phone: '',
        email: '',
        date: '',
        time: '',
        type: '' as AppointmentType,
        status: 'Pendente' as AppointmentStatus,
        attendantId: '',
        eventId: '',
        meetLink: '',
        notes: '',
        additionalInfo: '',
        studentProfile: {
            interest: '' as ProfileLevel,
            knowledge: '' as KnowledgeLevel,
            financial: { currency: 'BRL', amount: '' }
        }
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                lead: initialData.lead,
                phone: initialData.phone,
                email: initialData.email || '',
                date: initialData.date,
                time: initialData.time,
                type: initialData.type,
                status: initialData.status,
                attendantId: initialData.attendantId,
                eventId: initialData.eventId || '',
                meetLink: initialData.meetLink || '',
                notes: initialData.notes || '',
                additionalInfo: initialData.additionalInfo || '',
                studentProfile: initialData.studentProfile || {
                    interest: 'Médio',
                    knowledge: 'Iniciante',
                    financial: { currency: 'BRL', amount: '' }
                }
            });
        }
    }, [initialData]);

    // Mock logged-in user (in a real app, this would come from AuthContext)
    const CURRENT_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const currentUser = attendants.find(a => a.id === CURRENT_USER_ID) || attendants[0];

    // Auto-fill and disable logic
    useEffect(() => {
        if (!initialData && formData.type) {
            // 1. Ligação SDR
            if (formData.type === 'Ligação SDR' && currentUser) {
                setFormData(prev => ({ ...prev, attendantId: currentUser.id }));
            }
            // 2. Ligação Closer
            else if (formData.type === 'Ligação Closer') {
                setFormData(prev => ({ ...prev, attendantId: 'distribuicao_automatica' }));
            }
            // 3. Agendamento Pessoal
            else if (formData.type === 'Personal Appointment' && currentUser) {
                setFormData(prev => ({ ...prev, attendantId: currentUser.id }));
            }
            // 4. Reagendamento Closer (Reschedule)
            // 4. Reagendamento Closer (Reschedule)
            else if (formData.type === 'Reschedule' && formData.email) {
                // Find last appointment for this email of type 'Ligação Closer' or 'Reschedule'
                const relevantAppointments = appointments.filter(app =>
                    app.email === formData.email &&
                    (app.type === 'Ligação Closer' || app.type === 'Reschedule')
                );

                if (relevantAppointments.length > 0) {
                    // Sort by date/time descending
                    relevantAppointments.sort((a, b) => {
                        const dateA = new Date(`${a.date}T${a.time}`);
                        const dateB = new Date(`${b.date}T${b.time}`);
                        return dateB.getTime() - dateA.getTime();
                    });

                    const lastAttendantId = relevantAppointments[0].attendantId;
                    setFormData(prev => ({ ...prev, attendantId: lastAttendantId }));
                }
            }
        }
    }, [formData.type, formData.lead, formData.email, currentUser, appointments, initialData]);

    // Original auto-assign logic (kept for fallback or specific cases, but overridden by above for main types)
    // We can merge or remove the old one. The old one handled 'Closer' vs 'SDR' sector logic.
    // The new requirement is more specific. Let's keep the distribution logic trigger but ensure it respects the 'distribuicao_automatica' flag.
    // Actually, the previous logic was: if type is Closer, findAvailableCloser.
    // Now, if type is Closer, we set 'distribuicao_automatica'.
    // The ACTUAL distribution happens on SUBMIT (backend/n8n) or we resolve it here?
    // The user said: "directed to a closer following the check we have already configured".
    // This implies we should still run `findAvailableCloser` but maybe assign it immediately?
    // OR does "filled in with 'Distribuição Automática'" mean the UI shows that, but the data sent has the resolved ID?
    // Usually "filled in with..." implies the UI value.
    // Let's assume the UI shows "Distribuição Automática" and we resolve it on submit OR we resolve it and show the name?
    // "filled in with 'Distribuição Automática'" -> This sounds like a specific option in the dropdown.
    // But then "directed to a closer...".
    // If I set `attendantId` to 'distribuicao_automatica', the Select needs to have that option.
    // And on submit, we probably need to resolve it if it's not resolved yet.
    // BUT, the previous code resolved it in the Effect.
    // Let's adapt: If 'Ligação Closer', set to 'distribuicao_automatica'.
    // The actual assignment might happen later or we keep the `findAvailableCloser` logic to resolve it to a REAL ID but maybe we hide it?
    // "filled in with 'Distribuição Automática' ... and be disabled".
    // If I resolve it to "João", the UI shows "João".
    // If I set it to "distribuicao_automatica", the UI shows "Distribuição Automática".
    // I will implement the UI showing "Distribuição Automática".
    // The resolution (finding the closer) should probably happen on SAVE if we want to follow "directed to a closer...".
    // OR, we resolve it now, but the UI *says* "Distribuição Automática"? That's complex for a Select.
    // Let's stick to: Set value to 'distribuicao_automatica'.
    // We need to ensure `findAvailableCloser` is used somewhere.
    // If the user wants the form to "load times that are and are not available", maybe the resolution happens dynamically?
    // Let's keep the `findAvailableCloser` logic but maybe it updates a different state or we do it on submit.
    // For now, I will strictly follow "filled in with 'Distribuição Automática'".

    // We need to remove the OLD useEffect that was doing auto-assignment to avoid conflicts.
    // I will replace the block from line 94 to 121 with the new logic.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let finalAttendantId = formData.attendantId;

            // Resolve Automatic Distribution on Submit
            if (formData.attendantId === 'distribuicao_automatica') {
                const bestCloser = findAvailableCloser(
                    formData.date,
                    formData.time,
                    formData.type,
                    attendants,
                    appointments
                );
                if (bestCloser) {
                    finalAttendantId = bestCloser.id;
                } else {
                    alert('Não há closers disponíveis para este horário.');
                    return;
                }
            }

            if (initialData) {
                await updateAppointment(initialData.id, { ...formData, attendantId: finalAttendantId } as any);
            } else {
                // Use a valid UUID for createdBy. In a real app, this would be the logged-in user's ID.
                const creatorId = currentUser ? currentUser.id : 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
                await createAppointment({ ...formData, attendantId: finalAttendantId, createdBy: creatorId } as any);
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving appointment:', error);
        }
    };

    const updateProfile = (field: keyof typeof formData.studentProfile, value: string) => {
        setFormData(prev => ({
            ...prev,
            studentProfile: { ...prev.studentProfile, [field]: value }
        }));
    };

    const getConvertedValue = () => {
        const { currency, amount } = formData.studentProfile.financial;
        if (!amount || currency === 'BRL') return null;
        const rate = rates[currency];
        if (!rate) return null;
        return (parseFloat(amount) * rate).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Calculate end time (start time + 45 minutes)
    // Calculate end time (start time + duration)
    const calculateEndTime = (startTime: string) => {
        if (!startTime) return '';
        const [hours, minutes] = startTime.split(':').map(Number);
        const duration = (formData.type === 'Ligação Closer' || formData.type === 'Reschedule') ? 45 : 30;
        const totalMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    };

    const endTime = calculateEndTime(formData.time);

    if (loading) return <div>Carregando...</div>;

    // When editing, only allow editing Status, Descrição, and Atendente
    const isEditing = !!initialData;

    return (
        <form onSubmit={handleSubmit} className="space-y-4 px-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Row 1: ID (if exists) */}
                {initialData && (
                    <div className="col-span-2">
                        <Input
                            label="ID:"
                            value={initialData.id}
                            disabled
                            className="opacity-50 cursor-not-allowed"
                        />
                    </div>
                )}

                {/* Row 2: Email and Aluno */}
                <Input
                    label="Email:"
                    type="email"
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    disabled={isEditing}
                    required
                />

                {/* Row 3: Aluno and Telefone (shifted) */}
                <Input
                    label="Aluno:"
                    value={formData.lead}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, lead: e.target.value })}
                    required
                    placeholder="Nome completo do aluno"
                    disabled={isEditing}
                />
                <Input
                    label="Telefone:"
                    value={formData.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    placeholder="Apenas números"
                    disabled={isEditing}
                />

                {/* Row 3: Email and Evento */}

                <Select
                    label="Evento:"
                    value={formData.eventId}
                    onChange={e => setFormData({ ...formData, eventId: e.target.value })}
                    options={[{ value: '', label: 'Selecione o evento' }, ...events.filter(e => e.status === 'Active').map(e => ({ value: e.id, label: e.event_name }))]}
                    disabled={isEditing}
                    required
                />

                {/* Row 4: Tipo and Perfil Financeiro */}
                <Select
                    label="Tipo:"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as AppointmentType })}
                    options={[
                        { value: '', label: 'Selecione' },
                        // Only show "Ligação SDR" if user is SDR
                        ...(currentUser?.sector === 'SDR' ? [{ value: 'Ligação SDR', label: 'Ligação SDR' }] : []),
                        { value: 'Ligação Closer', label: 'Ligação Closer' },
                        { value: 'Personal Appointment', label: 'Agendamento Pessoal' },
                        { value: 'Reschedule', label: 'Reagendamento Closer' } // Mapped to "Reagendamento Closer" logic
                    ]}
                    disabled={isEditing}
                />
                <div className="space-y-1">
                    <label className="block text-sm font-bold text-foreground">Perfil Financeiro:</label>
                    <div className="flex gap-2">
                        <div className="w-24">
                            <Select
                                value={formData.studentProfile.financial.currency}
                                onChange={e => setFormData(prev => ({
                                    ...prev,
                                    studentProfile: {
                                        ...prev.studentProfile,
                                        financial: { ...prev.studentProfile.financial, currency: e.target.value }
                                    }
                                }))}
                                options={[
                                    { value: 'BRL', label: 'BRL' },
                                    { value: 'USD', label: 'USD' },
                                    { value: 'EUR', label: 'EUR' },
                                    { value: 'JPY', label: 'JPY' }
                                ]}
                                disabled={isEditing}
                            />
                        </div>
                        <div className="flex-1">
                            <Input
                                value={formData.studentProfile.financial.amount}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setFormData(prev => ({
                                        ...prev,
                                        studentProfile: {
                                            ...prev.studentProfile,
                                            financial: { ...prev.studentProfile.financial, amount: val }
                                        }
                                    }))
                                }}
                                placeholder="Valor"
                                disabled={isEditing}
                                required
                            />
                            {getConvertedValue() && (
                                <div className="text-xs text-white mt-1 text-right">
                                    ≈ {getConvertedValue()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Row 5: Perfil de Interesse and Perfil de Conhecimento */}
                <Select
                    label="Perfil de Interesse:"
                    value={formData.studentProfile.interest}
                    onChange={e => updateProfile('interest', e.target.value)}
                    options={[{ value: '', label: 'Selecione' }, { value: 'Baixo', label: 'Baixo' }, { value: 'Médio', label: 'Médio' }, { value: 'Alto', label: 'Alto' }]}
                    disabled={isEditing}
                />
                <Select
                    label="Perfil de Conhecimento:"
                    value={formData.studentProfile.knowledge}
                    onChange={e => updateProfile('knowledge', e.target.value)}
                    options={[{ value: '', label: 'Selecione' }, { value: 'Iniciante', label: 'Iniciante' }, { value: 'Intermediário', label: 'Intermediário' }, { value: 'Avançado', label: 'Avançado' }]}
                    disabled={isEditing}
                />

                {/* Row 6: Data and Horário */}
                <FloatingDateInput
                    label="Data:"
                    value={formData.date}
                    onChange={(e: any) => setFormData({ ...formData, date: e.target.value })}
                    disabled={isEditing || !formData.email || !formData.lead || !formData.phone || !formData.eventId || !formData.type}
                />
                <div className="grid grid-cols-2 gap-4">
                    <TimePickerInput
                        label="Horário:"
                        value={formData.time}
                        onChange={(time) => setFormData({ ...formData, time })}
                        disabled={isEditing || !formData.date}
                    />
                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-foreground">Horário Final:</label>
                        <Input
                            type="text"
                            value={endTime}
                            disabled
                            className="opacity-50 cursor-not-allowed"
                        />
                    </div>
                </div>
            </div>

            {/* Row 7: Informações Adicionais */}
            <div className="space-y-1">
                <label className="block text-sm font-bold text-foreground">Informações Adicionais:</label>
                <textarea
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50 resize-none"
                    rows={3}
                    value={formData.additionalInfo}
                    onChange={e => setFormData({ ...formData, additionalInfo: e.target.value })}
                    maxLength={300}
                    placeholder="Nenhuma informação adicional"
                    disabled={isEditing}
                    required
                />
                <div className="text-xs text-muted-foreground text-right">
                    {formData.additionalInfo.length}/300
                </div>
            </div>

            {/* Row 7: Descrição do Agendamento (TextArea) - ONLY VISIBLE WHEN EDITING */}
            {initialData && (
                <div className="space-y-1">
                    <label className="block text-sm font-bold text-foreground">Descrição do Agendamento:</label>
                    <textarea
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
                        rows={4}
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        maxLength={500}
                        placeholder="Digite a descrição do agendamento..."
                    />
                </div>
            )}

            {/* Row 8: Atendente and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={!initialData ? "col-span-2" : ""}>
                    <Select
                        label="Atendente:"
                        value={formData.attendantId}
                        onChange={e => setFormData({ ...formData, attendantId: e.target.value })}
                        options={[
                            { value: '', label: 'Selecione' },
                            { value: 'distribuicao_automatica', label: 'Distribuição Automática' },
                            ...attendants.map(a => ({ value: a.id, label: a.name }))
                        ]}
                        required
                        disabled={
                            // Disabled for specific types as per requirements
                            formData.type === 'Ligação SDR' ||
                            formData.type === 'Ligação Closer' ||
                            formData.type === 'Personal Appointment' ||
                            formData.type === 'Reschedule'
                        }
                    />
                </div>
                {initialData && (
                    <Select
                        label="Status:"
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value as AppointmentStatus })}
                        options={APPOINTMENT_STATUSES.map(status => ({ value: status, label: status }))}
                    />
                )}
            </div>

            {/* Row 9: Google Meet */}
            {initialData && (
                <Input
                    label="Google Meet:"
                    value={formData.meetLink}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, meetLink: e.target.value })}
                    placeholder="Link do Google Meet"
                    className="text-blue-500"
                    disabled={isEditing}
                />
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Fechar
                </Button>
                <Button type="submit">
                    Salvar
                </Button>
            </div>
        </form>
    );
};
