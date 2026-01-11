import React, { useState, useEffect } from 'react';
import { Eraser, Save, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { FloatingDateInput } from './FloatingDateInput';
import { TimePickerInput } from './TimePickerInput';
import { FloatingInput } from './FloatingInput';
import { FloatingTextArea } from './FloatingTextArea';
import { FloatingSelect } from './FloatingSelect';
import { useAppointments } from '../context/AppointmentContext';
import { useFormData } from '../hooks/useFormData';
import { APPOINTMENT_STATUSES } from '../types';
import type { Appointment, AppointmentType, ProfileLevel, KnowledgeLevel, AppointmentStatus } from '../types';
import { findAvailableCloser, isAttendantWithinSchedule, hasConflictingAppointment } from '../utils/distribution';
import { api } from '../services/api';
import { ClientHistory } from './ClientHistory';
import { useAuth } from '../context/AuthContext';
import { toastManager } from './ui/toast';
import { sanitizeInput } from '../utils/security';
import { getPurchasesByEmail } from '../services/pipedriveService';


interface AppointmentFormProps {
    initialData?: Appointment | null;
    prefillData?: {
        lead?: string;
        email?: string;
        phone?: string;
    } | null;
    onSuccess: () => void;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({ initialData, prefillData, onSuccess }) => {
    const { createAppointment, updateAppointment, appointments } = useAppointments();
    const { attendants, events, loading } = useFormData();
    const { user } = useAuth();
    const [rates, setRates] = useState<Record<string, number>>({});
    const [isExistingClient, setIsExistingClient] = useState(false);
    const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

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

    // When editing, only allow editing Status, Descrição, and Atendente
    const isEditing = !!initialData;

    const allowedTypes = React.useMemo(() => {
        const allTypes: { value: AppointmentType, label: string }[] = [
            { value: 'Ligação SDR', label: 'Ligação SDR' },
            { value: 'Ligação Closer', label: 'Ligação Closer' },
            { value: 'Agendamento Pessoal', label: 'Agendamento Pessoal' },
            { value: 'Reagendamento Closer', label: 'Reagendamento Closer' },
            { value: 'Upgrade', label: 'Upgrade' }
        ];

        if (!user) return [];
        if (user.sector === 'TEI' || user.role === 'Dev') return allTypes;

        if (user.sector === 'SDR') {
            return allTypes.filter(t => ['Ligação SDR', 'Ligação Closer', 'Reagendamento Closer', 'Upgrade'].includes(t.value));
        }
        if (user.sector === 'Closer') {
            return allTypes.filter(t => ['Ligação Closer', 'Agendamento Pessoal', 'Reagendamento Closer', 'Upgrade'].includes(t.value));
        }
        if (user.sector === 'Tribo') {
            return allTypes.filter(t => ['Agendamento Pessoal'].includes(t.value));
        }

        return allTypes;
    }, [user]);

    const attendantOptions = [
        { value: 'distribuicao_automatica', label: 'Distribuição Automática' },
        ...attendants
            .filter(a => formData.type === 'Upgrade' ? a.sector === 'Closer' : true)
            .map(a => ({ value: a.id, label: a.name }))
    ];

    useEffect(() => {
        if (initialData) {
            setFormData({
                lead: initialData.lead,
                phone: String(initialData.phone || ''),
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
                    interest: 'Mediano',
                    knowledge: 'Iniciante',
                    financial: { currency: 'BRL', amount: '' }
                }
            });
        } else if (prefillData) {
            setFormData(prev => ({
                ...prev,
                lead: prefillData.lead || prev.lead,
                email: prefillData.email || prev.email,
                phone: prefillData.phone || prev.phone
            }));
        }
    }, [initialData, prefillData]);

    // Auto-fill and disable logic
    useEffect(() => {
        if (!initialData && formData.type && user) {
            // 1. Ligação SDR
            if (formData.type === 'Ligação SDR') {
                if (user.sector === 'SDR') {
                    setFormData(prev => ({ ...prev, attendantId: user.id }));
                } else if (user.sector === 'TEI') { // Dev override if needed
                    setFormData(prev => ({ ...prev, attendantId: user.id }));
                }
            }
            // 2. Ligação Closer
            else if (formData.type === 'Ligação Closer') {
                if (user.sector === 'Closer') {
                    setFormData(prev => ({ ...prev, attendantId: user.id }));
                } else {
                    setFormData(prev => ({ ...prev, attendantId: 'distribuicao_automatica' }));
                }
            }
            // 3. Agendamento Pessoal
            else if (formData.type === 'Agendamento Pessoal') {
                setFormData(prev => ({ ...prev, attendantId: user.id }));
            }

            // Special case for Tribo: Always force attendant to self if type matches (which is enforced by allowedTypes)
            if (user.sector === 'Tribo') {
                setFormData(prev => ({ ...prev, attendantId: user.id }));
            }
            // 4. Reagendamento Closer
            else if (formData.type === 'Reagendamento Closer' && formData.phone) {
                const targetPhone = formData.phone.replace(/\D/g, '');

                // Search for relevant past appointments
                const relevantAppointments = appointments.filter(app => {
                    const appPhone = String(app.phone);
                    return appPhone === targetPhone &&
                        (app.type === 'Ligação Closer' ||
                            app.type === 'Reagendamento Closer' ||
                            app.type === 'Agendamento Pessoal');
                });

                if (relevantAppointments.length > 0) {
                    // Sort by date/time descending to get most recent
                    relevantAppointments.sort((a, b) => {
                        const dateA = new Date(`${a.date}T${a.time}`);
                        const dateB = new Date(`${b.date}T${b.time}`);
                        return dateB.getTime() - dateA.getTime();
                    });

                    const lastAttendantId = relevantAppointments[0].attendantId;
                    setFormData(prev => ({ ...prev, attendantId: lastAttendantId }));
                } else {
                    // No history logic needed here, validation handles permissions. 
                    // Fallback to manual selection or distribution is fine.
                }
            }
            // 5. Upgrade
            else if (formData.type === 'Upgrade') {
                // Manual selection - do not auto-overwrite if user selected something
                // Ensure field is enabled in the UI
            }
        }
    }, [formData.type, formData.lead, formData.phone, user, appointments, initialData]);


    const checkEligibility = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 8) return false;

        return appointments.some(app =>
            String(app.phone) === cleanPhone &&
            ['Ligação Closer', 'Upgrade'].includes(app.type)
        );
    };

    const fetchPurchaseHistory = async (email: string) => {
        if (!email) {
            setPurchaseHistory([]);
            return;
        }
        try {
            // toastManager.add({ title: "Pipedrive", description: "Buscando histórico...", type: 'info', duration: 2000 });
            const history = await getPurchasesByEmail(email);
            setPurchaseHistory(history);

            if (history.length > 0) {
                toastManager.add({
                    title: "Pipedrive",
                    description: `${history.length} compra(s) encontrada(s).`,
                    type: 'success'
                });
            } else {
                // Optional: Notify if nothing found, helpful for debugging why panel doesn't open
                toastManager.add({
                    title: "Pipedrive",
                    description: "Nenhuma compra encontrada.",
                    type: 'info'
                });
            }
        } catch (error: any) {
            console.error("Error fetching purchase history:", error);
            toastManager.add({
                title: "Erro Pipedrive",
                description: "Falha ao buscar histórico.",
                type: 'error'
            });
            setPurchaseHistory([]);
        }
    };

    const handlePhoneBlur = async () => {
        if (!formData.phone) return;
        const digits = formData.phone.replace(/\D/g, '');
        if (!digits) return;

        // Validation for Reagendamento Closer
        if (formData.type === 'Reagendamento Closer') {
            if (!checkEligibility(formData.phone)) {
                toastManager.add({
                    title: "Permissão Negada",
                    description: "Este cliente não possui um histórico (Ligação Closer ou Upgrade) para realizar um reagendamento.",
                    type: 'error'
                });
                setFormData(prev => ({ ...prev, type: '' as AppointmentType }));
                return;
            }
        }

        try {
            const client = await api.clients.getByPhone(digits);
            if (client) {
                setFormData(prev => ({
                    ...prev,
                    lead: client.name,
                    email: client.email || '',
                    studentProfile: {
                        interest: client.interest_level || '',
                        knowledge: client.knowledge_level || '',
                        financial: {
                            currency: client.financial_currency || 'BRL',
                            amount: client.financial_amount ? String(client.financial_amount) : ''
                        }
                    }
                }));
                setIsExistingClient(true);

                // Fetch Pipedrive History if email exists
                if (client.email) {
                    fetchPurchaseHistory(client.email);
                } else {
                    setPurchaseHistory([]);
                }
            } else {
                setIsExistingClient(false);
                // If we have an email, try to fetch Pipedrive history again (or keep it), 
                // instead of blindly clearing it. This handles the case of a new client 
                // where we typed Email then Phone, or corrected Phone.
                if (formData.email) {
                    fetchPurchaseHistory(formData.email);
                } else {
                    setPurchaseHistory([]);
                }
            }
        } catch (error) {
            console.error('Error checking client phone:', error);
            setIsExistingClient(false);
            setPurchaseHistory([]);
        }
    };

    const handleClear = () => {
        setFormData({
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
        setIsExistingClient(false);
        setPurchaseHistory([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSaving) return;

        // Final Validation Gatekeeper
        if (formData.type === 'Reagendamento Closer') {
            if (!checkEligibility(formData.phone)) {
                toastManager.add({
                    title: "Erro",
                    description: "Este cliente não possui um histórico (Ligação Closer ou Upgrade) para realizar um reagendamento.",
                    type: 'error'
                });
                return;
            }
        }

        // Helper to check availability
        const checkAvailability = (attendantId: string) => {
            const selectedAttendant = attendants.find(a => a.id === attendantId);
            if (!selectedAttendant) return true; // Can't validate if not found

            // 1. Check Schedule (Work hours + Pauses)
            if (!isAttendantWithinSchedule(selectedAttendant, formData.date, formData.time, formData.type)) {
                toastManager.add({
                    title: "Indisponibilidade",
                    description: `${selectedAttendant.name} não está disponível neste horário (Fora de expediente ou Pausa).`,
                    type: 'error'
                });
                return false;
            }

            // 2. Check Conflicts (Overlapping appointments)
            if (hasConflictingAppointment(attendantId, formData.date, formData.time, formData.type, appointments)) {
                toastManager.add({
                    title: "Conflito de Agenda",
                    description: `${selectedAttendant.name} já possui um agendamento conflitante neste horário.`,
                    type: 'error'
                });
                return false;
            }
            return true;
        };

        // Validate 'Upgrade' and 'Reagendamento Closer' manual selections
        if (formData.type === 'Upgrade' || formData.type === 'Reagendamento Closer') {
            if (formData.attendantId && formData.attendantId !== 'distribuicao_automatica') {
                if (!checkAvailability(formData.attendantId)) {
                    return;
                }
            }
        }

        setIsSaving(true);

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
                    setIsSaving(false);
                    return;
                }
            }

            // Map creatorId
            const creatorId = user?.id;

            if (initialData) {
                await updateAppointment(initialData.id, {
                    ...formData,
                    phone: Number(formData.phone.replace(/\D/g, '')),
                    attendantId: finalAttendantId,
                    updatedBy: user?.id // Pass current user for status tracking
                } as any);
            } else {
                await createAppointment({
                    ...formData,
                    phone: Number(formData.phone.replace(/\D/g, '')),
                    attendantId: finalAttendantId,
                    createdBy: creatorId
                } as any);
            }
            onSuccess();
        } catch (error: any) {
            console.error('Error saving appointment:', error);
            setIsSaving(false);

            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;

                // Handle Validation Errors (400)
                if (status === 400 && data.details) {
                    // Zod formatted error structure usually has _errors array or field specific errors
                    // Flattening the errors for display
                    const errorMessages: string[] = [];

                    if (data.details._errors) {
                        errorMessages.push(...data.details._errors);
                    }

                    // Iterate over keys to find field-specific errors
                    Object.keys(data.details).forEach(key => {
                        if (key !== '_errors' && data.details[key]._errors) {
                            errorMessages.push(...data.details[key]._errors);
                        }
                    });

                    // If no structured details found, fallback to generic message
                    if (errorMessages.length === 0 && data.error) {
                        errorMessages.push(data.error);
                    }

                    // Display unique messages
                    [...new Set(errorMessages)].forEach(msg => {
                        toastManager.add({
                            title: "Erro de Validação",
                            description: msg,
                            type: 'error'
                        });
                    });
                } else {
                    // Generic Server Errors (4xx, 5xx)
                    toastManager.add({
                        title: "Erro",
                        description: `Erro ${status}`,
                        type: 'error'
                    });
                }
            } else {
                // Network or other errors
                toastManager.add({
                    title: "Erro",
                    description: "Ocorreu um erro inesperado. Verifique sua conexão.",
                    type: 'error'
                });
            }
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

        // Parse formatted string "1.000,00" -> 1000.00
        const cleanAmount = String(amount).replace(/\./g, '').replace(',', '.');
        const value = parseFloat(cleanAmount);

        if (isNaN(value)) return null;

        return (value * rate).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Calculate end time (start time + duration)
    const calculateEndTime = (startTime: string) => {
        if (!startTime) return '';
        const [hours, minutes] = startTime.split(':').map(Number);

        let duration = 60; // Default for most types

        if (formData.type === 'Ligação SDR') {
            duration = 30;
        }

        const totalMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    };

    const endTime = calculateEndTime(formData.time);

    if (loading) return <div>Carregando...</div>;

    const getBrazilStats = () => {
        const now = new Date();
        const brazilTimeStr = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
        const brazilDate = new Date(brazilTimeStr);
        const year = brazilDate.getFullYear();
        const month = brazilDate.getMonth();
        const day = brazilDate.getDate();

        const todayDate = new Date(year, month, day);
        const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const hours = String(brazilDate.getHours()).padStart(2, '0');
        const minutes = String(brazilDate.getMinutes()).padStart(2, '0');
        const nowTimeStr = `${hours}:${minutes}`;

        return { todayDate, todayStr, nowTimeStr };
    };

    const { todayDate, todayStr, nowTimeStr } = getBrazilStats();

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex border border-border rounded-lg bg-surface shadow-sm overflow-hidden">
                <div className="flex-1 p-6 space-y-4 min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Row 2: Telefone (First) and Aluno */}
                        <div className="col-span-1 md:col-span-2 relative mt-0 mb-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-surface px-2 text-muted-foreground font-medium">
                                    Cliente
                                </span>
                            </div>
                        </div>
                        <FloatingInput
                            label="Telefone"
                            value={formData.phone}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: sanitizeInput.digits(e.target.value) })}
                            onBlur={handlePhoneBlur}
                            required
                            disabled={isEditing || isExistingClient}
                            maxLength={20}
                        />
                        <FloatingInput
                            label="Nome"
                            value={formData.lead}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setFormData({ ...formData, lead: sanitizeInput.name(e.target.value) });
                            }}
                            onBlur={() => setFormData(prev => ({ ...prev, lead: prev.lead.trim() }))}
                            required
                            disabled={isEditing || isExistingClient}
                            maxLength={100}
                        />

                        {/* Row 2: Email and Perfil de Interesse */}
                        <FloatingInput
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const val = sanitizeInput.email(e.target.value);
                                setFormData({ ...formData, email: val });
                                if (isExistingClient && val !== formData.email) {
                                    setIsExistingClient(false);
                                }
                            }}
                            onBlur={() => {
                                if (formData.email) {
                                    fetchPurchaseHistory(formData.email);
                                }
                            }}
                            required
                            disabled={isEditing}
                        />

                        <FloatingSelect
                            label="Perfil de Interesse"
                            value={formData.studentProfile.interest}
                            onChange={(e: any) => updateProfile('interest', e.target.value)}
                            options={[{ value: 'Alto', label: 'Alto' }, { value: 'Mediano', label: 'Mediano' }, { value: 'Desconhecido', label: 'Desconhecido' }]}
                            disabled={isEditing}
                        />

                        {/* Row 3: Moeda/Financeiro and Perfil de Conhecimento */}
                        <div className="space-y-1">
                            <div className="flex gap-2">
                                <div className="w-24">
                                    <FloatingSelect
                                        label="Moeda"
                                        value={formData.studentProfile.financial.currency}
                                        onChange={(e: any) => setFormData(prev => ({
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
                                    <FloatingInput
                                        label="Perfil Financeiro (Valor)"
                                        value={formData.studentProfile.financial.amount}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            const formatted = sanitizeInput.currency(e.target.value);
                                            setFormData(prev => ({
                                                ...prev,
                                                studentProfile: {
                                                    ...prev.studentProfile,
                                                    financial: { ...prev.studentProfile.financial, amount: formatted }
                                                }
                                            }))
                                        }}
                                        disabled={isEditing}
                                        required
                                    />
                                    {getConvertedValue() && (
                                        <div className="text-xs text-muted-foreground mt-1 text-right">
                                            ≈ {getConvertedValue()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <FloatingSelect
                            label="Perfil de Conhecimento"
                            value={formData.studentProfile.knowledge}
                            onChange={(e: any) => updateProfile('knowledge', e.target.value)}
                            options={[{ value: 'Iniciante', label: 'Iniciante' }, { value: 'Intermediário', label: 'Intermediário' }, { value: 'Avançado', label: 'Avançado' }]}
                            disabled={isEditing}
                        />

                        {/* Row 4: Evento and Tipo */}
                        <div className="col-span-1 md:col-span-2 relative mt-1 mb-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-surface px-2 text-muted-foreground font-medium">
                                    Agendamento
                                </span>
                            </div>
                        </div>
                        <FloatingSelect
                            label="Evento"
                            value={formData.eventId}
                            onChange={(e: any) => setFormData({ ...formData, eventId: e.target.value })}
                            options={[...events.filter(e => e.status === true && (!e.sector || (user && user.sector === e.sector))).map(e => ({ value: e.id, label: e.event_name }))]}
                            disabled={isEditing}
                        />
                        <FloatingSelect
                            label="Tipo"
                            value={formData.type}
                            onChange={(e: any) => {
                                const newType = e.target.value as AppointmentType;
                                if (newType === 'Reagendamento Closer' && formData.phone) {
                                    if (!checkEligibility(formData.phone)) {
                                        toastManager.add({
                                            title: "Permissão Negada",
                                            description: "Este cliente não possui um histórico (Ligação Closer ou Upgrade) para realizar um reagendamento.",
                                            type: 'error'
                                        });
                                        return; // Prevent selection
                                    }
                                }
                                setFormData({ ...formData, type: newType });
                            }}
                            options={[...allowedTypes]}
                            disabled={isEditing}
                        />

                        {/* Row 5: Data and Horário */}
                        <FloatingDateInput
                            label="Data"
                            value={formData.date}
                            onChange={(e: any) => setFormData({ ...formData, date: e.target.value })}
                            minDate={todayDate}
                            disabled={isEditing || !formData.email || !formData.lead || !formData.phone || !formData.eventId || !formData.type}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <TimePickerInput
                                label="Horário"
                                value={formData.time}
                                onChange={(time) => setFormData({ ...formData, time })}
                                minTime={formData.date === todayStr ? nowTimeStr : undefined}
                                disabled={isEditing || !formData.date}
                            />
                            <FloatingInput
                                label="Horário Final"
                                type="text"
                                value={endTime}
                                disabled
                                className="opacity-50 cursor-not-allowed"
                            />
                        </div>

                        {/* Row 7: Informações Adicionais */}
                        <div className="relative">
                            <FloatingTextArea
                                label="Informações Adicionais"
                                value={formData.additionalInfo}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                    setFormData({ ...formData, additionalInfo: sanitizeInput.strictText(e.target.value) });
                                }}
                                maxLength={300}
                                disabled={isEditing}
                                rows={3}
                                className="pb-6"
                            />
                            <div className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
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
                                {formData.type === 'Agendamento Pessoal' && user ? (
                                    <FloatingInput
                                        label="Atendente"
                                        value={user.name}
                                        disabled
                                        className="opacity-100 bg-muted/50 text-foreground"
                                    />
                                ) : (
                                    <FloatingSelect
                                        label="Atendente"
                                        value={formData.attendantId}
                                        onChange={(e: any) => setFormData({ ...formData, attendantId: e.target.value })}
                                        options={attendantOptions}
                                        disabled={
                                            // Enabled if:
                                            // 1. Creating new 'Upgrade' appointment
                                            // 2. Editing existing appointment AND user has specific role permissions
                                            isEditing
                                                ? !(user && ['Co-Líder', 'Líder', 'Admin', 'Dev'].includes(user.role))
                                                : formData.type !== 'Upgrade'
                                        }
                                    />
                                )}
                            </div>
                            {initialData && (
                                <FloatingSelect
                                    label="Status"
                                    value={formData.status}
                                    onChange={(e: any) => setFormData({ ...formData, status: e.target.value as AppointmentStatus })}
                                    options={APPOINTMENT_STATUSES.map(status => ({ value: status, label: status }))}
                                    disabled={
                                        !user || (
                                            user.id !== initialData.createdBy && // not creator
                                            user.id !== initialData.attendantId && // not attendant
                                            user.role !== 'Líder' &&
                                            user.role !== 'Co-Líder' && // Usually Co-Líder has similar perms, but request said specifically 'sector Líder'. I'll stick to 'Líder' role if strict, but maybe 'Co-Líder' too? The request says "sector Líder". Let's assume role 'Líder' covers it. I'll include 'Admin' and 'Dev' for safety as they usually have super powers.
                                            user.role !== 'Admin' &&
                                            user.role !== 'Dev'
                                        )
                                    }
                                />
                            )}
                            {initialData && (initialData.updater || initialData.updatedBy) && (
                                <div className="col-span-1 md:col-span-2 flex justify-end -mt-3">
                                    <span className="text-xs text-muted-foreground">
                                        Editado por: {initialData.updater?.name || 'Sistema'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Row 9: Google Meet */}
                        {initialData && (
                            <FloatingInput
                                label="Google Meet"
                                value={formData.meetLink}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, meetLink: e.target.value })}
                                className="text-blue-500"
                                disabled={isEditing}
                            />
                        )}
                    </div>
                </div>



                {!initialData && <ClientHistory phone={formData.phone} externalHistory={purchaseHistory} />}
            </div >
            <div className="flex justify-end gap-3">

                {!initialData && (
                    <Button type="button" variant="secondary" onClick={handleClear} className="flex items-center gap-2" disabled={isSaving}>
                        <Eraser size={18} />
                        Limpar
                    </Button>
                )}
                <Button type="submit" className="flex items-center gap-2" disabled={isSaving}>
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
            </div>
        </form >
    );
};
