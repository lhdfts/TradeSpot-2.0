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
import { findAvailableCloser, isAttendantWithinSchedule, hasConflictingAppointment, generateAllTimes } from '../utils/distribution';
import { api } from '../services/api';
import { ClientHistory } from './ClientHistory';
import { useAuth } from '../context/AuthContext';
import { toastManager } from './ui/toast';
import { sanitizeInput } from '../utils/security';
import { getPurchasesByEmail } from '../services/pipedriveService';

const BLOCKED_EVENT_ID = 'df5f53c4-d659-4fa5-b779-627f6ec4f064';
const BLOCKED_CLOSER_ID = '5b2553e4-6c1a-434d-909d-ae479f74faee';
const ON_THE_ROAD_EVENT_ID = '62936e18-6042-43c9-8526-6ec920184351';

const isCloserBlockedForSelectedEvent = (eventId: string, attendantId: string) => {
    return eventId === BLOCKED_EVENT_ID && attendantId === BLOCKED_CLOSER_ID;
};


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
    const { attendants, events, loading, refreshAttendants } = useFormData();
    const { user } = useAuth();
    const [rates, setRates] = useState<Record<string, number>>({});
    const [isExistingClient, setIsExistingClient] = useState(false);
    const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});


    useEffect(() => {
        fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,JPY-BRL,USD-AOA')
            .then(res => res.json())
            .then(data => {
                const usdBrl = parseFloat(data.USDBRL.bid);
                setRates({
                    USD: usdBrl,
                    EUR: parseFloat(data.EURBRL.bid),
                    JPY: parseFloat(data.JPYBRL.bid),
                    AOA: usdBrl / parseFloat(data.USDAOA.bid) // Derive AOA from USD-AOA and USD-BRL
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

    const [availableTimes, setAvailableTimes] = useState<string[] | undefined>(undefined);

    useEffect(() => {
        if (!formData.date || !formData.type) {
            setAvailableTimes(undefined);
            return;
        }

        if (formData.type === 'Fora da agenda') {
            setAvailableTimes(generateAllTimes());
            return;
        }

        const allTimes = generateAllTimes();
        const selectedEvent = events.find(e => e.id === formData.eventId);
        const durationMinutes = selectedEvent?.duration_minutes;
        const filtered = allTimes.filter(time => {
            const isEditing = !!initialData;
            const isSameExistingAssignment = isEditing &&
                initialData?.attendantId === formData.attendantId &&
                initialData?.eventId === formData.eventId;
            const isBlockedForThisEvent = isCloserBlockedForSelectedEvent(formData.eventId, formData.attendantId);

            // 1. Manually Selected Attendant
            if (formData.attendantId && formData.attendantId !== 'distribuicao_automatica') {
                if (isBlockedForThisEvent && !isSameExistingAssignment) return false;

                const attendant = attendants.find(a => a.id === formData.attendantId);
                if (!attendant) return false;
                return isAttendantWithinSchedule(attendant, formData.date, time, formData.type, durationMinutes) &&
                    !hasConflictingAppointment(attendant.id, formData.date, time, formData.type, appointments, initialData?.id, durationMinutes);
            }

            // 2. Automatic Distribution (or nothing selected yet)
            // Returns true if ANY closer is available (findAvailableCloser encapsulates schedule & conflict checks)
            const attendantsForEvent = formData.eventId === BLOCKED_EVENT_ID
                ? attendants.filter(a => a.id !== BLOCKED_CLOSER_ID)
                : attendants;
            const available = findAvailableCloser(formData.date, time, formData.type, attendantsForEvent, appointments, durationMinutes);
            return !!available;
        });

        setAvailableTimes(filtered);
    }, [formData.date, formData.type, formData.attendantId, formData.eventId, attendants, appointments, initialData, events]);

    // When editing, only allow editing Status, Descrição, and Atendente
    const isEditing = !!initialData;

    const allowedTypes = React.useMemo(() => {
        const allTypes: { value: AppointmentType, label: string }[] = [
            { value: 'Ligação SDR', label: 'Ligação SDR' },
            { value: 'Ligação Closer', label: 'Ligação Closer' },
            { value: 'Agendamento Pessoal', label: 'Agendamento Pessoal' },
            { value: 'Reagendamento Closer', label: 'Reagendamento Closer' },
            { value: 'Upgrade', label: 'Upgrade' },
            { value: 'Fora da agenda', label: 'Fora da agenda' }
        ];

        const selectedEvent = events.find(e => e.id === formData.eventId);
        if (selectedEvent && (selectedEvent.event_name === 'Primeiro Dólar na Prática' || selectedEvent.event_name === 'Dollar On Demand')) {
            allTypes.push({ value: 'Gold Call', label: 'Gold Call' });
        }

        if (user && (user.sector === 'Aldeia' || user.sector === 'Tribo' || user.sector === 'TEI' || user.role === 'Dev' || user.role === 'Admin')) {
            allTypes.push(
                { value: 'Onboarding', label: 'Onboarding' }
            );
        }

        if (!user) return [];
        if (user.sector === 'TEI' || user.role === 'Dev' || user.role === 'Admin') return allTypes;

        if (user.sector === 'SDR') {
            return allTypes.filter(t => ['Ligação SDR', 'Ligação Closer', 'Reagendamento Closer', 'Upgrade', 'Fora da agenda', 'Gold Call'].includes(t.value));
        }
        if (user.sector === 'Closer') {
            return allTypes.filter(t => ['Ligação Closer', 'Agendamento Pessoal', 'Reagendamento Closer', 'Upgrade', 'Fora da agenda', 'Gold Call'].includes(t.value));
        }
        if (user.sector === 'Tribo') {
            return allTypes.filter(t => ['Agendamento Pessoal', 'Onboarding'].includes(t.value));
        }
        if (user.sector === 'Aldeia') {
            const allowed = ['Agendamento Pessoal', 'Onboarding'];
            if (formData.eventId === ON_THE_ROAD_EVENT_ID) {
                allowed.push('Ligação Closer');
            }
            return allTypes.filter(t => allowed.includes(t.value));
        }
        if (user.sector === 'Social Seller') {
            return allTypes.filter(t => ['Ligação Closer', 'Reagendamento Closer', 'Upgrade', 'Gold Call'].includes(t.value));
        }
        if (user.sector === 'Perpétuos') {
            return allTypes.filter(t => ['Gold Call'].includes(t.value));
        }

        return allTypes;
    }, [user, formData.eventId, events]);

    const attendantOptions = React.useMemo(() => {
        // When EDITING, filter attendants by appointment type strictly
        if (isEditing) {
            const typeToSectorMap: Record<string, string> = {
                'Ligação Closer': 'Closer',
                'Gold Call': 'Closer',
                'Reagendamento Closer': 'Closer',
                'Upgrade': 'Closer',
                'Ligação SDR': 'SDR'
            };

            const requiredSector = typeToSectorMap[formData.type];

            // Filter attendants by sector if type requires it
            const filteredAttendants = requiredSector
                ? attendants.filter(a => a.sector === requiredSector)
                : attendants; // For other types like 'Agendamento Pessoal', 'Fora da agenda', show all

            const shouldBlock = formData.eventId === BLOCKED_EVENT_ID;
            const filteredAttendantsForBlock = shouldBlock
                ? filteredAttendants.filter(a =>
                    a.id !== BLOCKED_CLOSER_ID || a.id === initialData?.attendantId
                )
                : filteredAttendants;

            return filteredAttendantsForBlock.map(a => ({ value: a.id, label: a.name }));
        }

        // Original logic for CREATING new appointments
        const options = [
            ...(formData.type === 'Fora da agenda' ? [] : [{ value: 'distribuicao_automatica', label: 'Distribuição Automática' }]),
            ...attendants
                .filter(a => {
                    const shouldBlock = formData.eventId === BLOCKED_EVENT_ID;
                    if (shouldBlock && a.id === BLOCKED_CLOSER_ID) return false;

                    const selectedEvent = events.find(e => e.id === formData.eventId);
                    const eventSector = selectedEvent?.sector;
                    const isAdministrative = user && ['Dev', 'Admin', 'Líder', 'Co-Líder', 'Co-líder', 'Qualidade'].includes(user.role);

                    if (formData.type === 'Upgrade' || formData.type === 'Reagendamento Closer' || formData.type === 'Fora da agenda' || formData.type === 'Ligação Closer' || formData.type === 'Gold Call') return a.sector === 'Closer';

                    if (isAdministrative) {
                        return eventSector ? a.sector === eventSector : true;
                    }

                    if (user?.sector === 'TEI') return true;
                    return user?.sector ? a.sector === user.sector : true;
                })
                .map(a => ({ value: a.id, label: a.name }))
        ];

        // Se o usuário for Aldeia e o tipo for Ligação Closer/Gold Call, mostrar apenas Distribuição Automática
        if (user?.sector === 'Aldeia' && (formData.type === 'Ligação Closer' || formData.type === 'Gold Call')) {
            return options.filter(opt => opt.value === 'distribuicao_automatica');
        }

        return options;
    }, [isEditing, formData.type, formData.eventId, attendants, events, user]);

    const eventOptions = React.useMemo(() => {
        // Filter active events by sector (or if user is privileged)
        const filtered = events.filter(e => {
            if (e.status !== true) return false;
            if (user?.sector === 'Perpétuos') return e.sector === 'Perpétuos';

            // Special case for On The Road 2.0 and Aldeia
            // if (e.id === ON_THE_ROAD_EVENT_ID && user?.sector === 'Aldeia') return true;

            return !e.sector || (user && (['Dev', 'Admin', 'Líder', 'Co-Líder', 'Co-líder', 'Qualidade'].includes(user.role) || user.sector === e.sector));
        });

        // If we are editing and the current event is not in the list, add it
        if (initialData?.eventId && !filtered.some(e => e.id === initialData.eventId)) {
            const currentEvent = events.find(e => e.id === initialData.eventId);
            if (currentEvent) {
                filtered.push(currentEvent);
            }
        }

        return filtered.map(e => ({ value: e.id, label: e.event_name }));
    }, [events, user, initialData]);

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
            // 2. Ligação Closer & Gold Call
            else if (formData.type === 'Ligação Closer' || formData.type === 'Gold Call') {
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

            // Special case for Tribo and Aldeia: Force attendant to self if type matches "Agendamento Pessoal" or "Onboarding"
            if ((user.sector === 'Tribo' || user.sector === 'Aldeia') && (formData.type === 'Agendamento Pessoal' || formData.type === 'Onboarding')) {
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
                            app.type === 'Gold Call' ||
                            app.type === 'Reagendamento Closer' ||
                            app.type === 'Agendamento Pessoal' ||
                            app.type === 'Upgrade');
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
            ['Ligação Closer', 'Upgrade', 'Gold Call'].includes(app.type)
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
                    description: "Este cliente não possui um histórico (Ligação Closer, Gold Call ou Upgrade) para realizar um reagendamento.",
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

        // Manual validation for required fields to provide better feedback
        if (!formData.lead) { toastManager.add({ title: "Erro", description: "Nome é obrigatório", type: 'error' }); return; }
        if (!formData.phone) { toastManager.add({ title: "Erro", description: "Telefone é obrigatório", type: 'error' }); return; }
        if (!formData.email) { toastManager.add({ title: "Erro", description: "Email é obrigatório", type: 'error' }); return; }
        if (String(formData.studentProfile.financial.amount) === '') {
            toastManager.add({ title: "Erro", description: "Valor do Perfil Financeiro é obrigatório", type: 'error' });
            return;
        }

        // Final Validation Gatekeeper
        if (formData.type === 'Reagendamento Closer') {
            if (!checkEligibility(formData.phone)) {
                toastManager.add({
                    title: "Erro",
                    description: "Este cliente não possui um histórico (Ligação Closer, Gold Call ou Upgrade) para realizar um reagendamento.",
                    type: 'error'
                });
                return;
            }
        }

        // Helper to check availability
        const checkAvailability = (attendantId: string) => {
            if (formData.type === 'Fora da agenda') return true;
            const selectedEvent = events.find(e => e.id === formData.eventId);
            const durationMinutes = selectedEvent?.duration_minutes;

            // Blocked closer cannot be assigned for this event (except when editing the existing assignment)
            const isEditingMode = !!initialData;
            const isSameExistingAssignment = isEditingMode &&
                initialData?.attendantId === attendantId &&
                initialData?.eventId === formData.eventId;
            if (isCloserBlockedForSelectedEvent(formData.eventId, attendantId) && !isSameExistingAssignment) {
                toastManager.add({
                    title: "Indisponibilidade",
                    description: "Este atendente está bloqueado para este evento.",
                    type: 'error'
                });
                return false;
            }

            const selectedAttendant = attendants.find(a => a.id === attendantId);
            if (!selectedAttendant) return true; // Can't validate if not found

            // 1. Check Schedule (Work hours + Pauses)
            if (!isAttendantWithinSchedule(selectedAttendant, formData.date, formData.time, formData.type, durationMinutes)) {
                toastManager.add({
                    title: "Indisponibilidade",
                    description: `${selectedAttendant.name} não está disponível neste horário (Fora de expediente ou Pausa).`,
                    type: 'error'
                });
                return false;
            }

            // 2. Check Conflicts (Overlapping appointments)
            if (hasConflictingAppointment(attendantId, formData.date, formData.time, formData.type, appointments, initialData?.id, durationMinutes)) {
                toastManager.add({
                    title: "Conflito de Agenda",
                    description: `${selectedAttendant.name} já possui um agendamento conflitante neste horário.`,
                    type: 'error'
                });
                return false;
            }

            // 3. Check 10-minute buffer (Final check before submission)
            const now = new Date();
            const apptDateTime = new Date(`${formData.date}T${formData.time}:00-03:00`);
            const diffMinutes = (apptDateTime.getTime() - now.getTime()) / 60000;

            if (diffMinutes < 10) {
                toastManager.add({
                    title: "Horário Inválido",
                    description: "Os agendamentos devem ser marcados com pelo menos 10 minutos de antecedência.",
                    type: 'error'
                });
                return false;
            }

            return true;
        };

        // Validate 'Upgrade' and 'Reagendamento Closer' manual selections
        if (formData.type === 'Upgrade' || formData.type === 'Reagendamento Closer') {
            if (formData.attendantId && formData.attendantId !== 'distribuicao_automatica') {
                // Skip validation if we are editing and the schedule-relevant fields haven't changed
                const isScheduleChanged = !initialData ||
                    initialData.date !== formData.date ||
                    initialData.time !== formData.time ||
                    initialData.attendantId !== formData.attendantId;

                if (isScheduleChanged) {
                    if (!checkAvailability(formData.attendantId)) {
                        return;
                    }
                }
            }
        }

        setIsSaving(true);

        try {
            let finalAttendantId = formData.attendantId;

            // Resolve Automatic Distribution on Submit
            if (formData.attendantId === 'distribuicao_automatica') {
                const selectedEvent = events.find(e => e.id === formData.eventId);
                const durationMinutes = selectedEvent?.duration_minutes;

                // FRESH DATA: Refresh attendants before distribution to avoid stale sector/schedule data
                const freshAttendants = await refreshAttendants();
                console.log('[DISTRIBUTION] Refreshed attendants before submit:', freshAttendants.length, 'total');

                const freshAttendantsForEvent = formData.eventId === BLOCKED_EVENT_ID
                    ? freshAttendants.filter(a => a.id !== BLOCKED_CLOSER_ID)
                    : freshAttendants;

                const bestCloser = findAvailableCloser(
                    formData.date,
                    formData.time,
                    formData.type,
                    freshAttendantsForEvent,
                    appointments,
                    durationMinutes
                );
                if (bestCloser) {
                    console.log(`[DISTRIBUTION] Assigned: ${bestCloser.name} (sector: ${bestCloser.sector}, id: ${bestCloser.id})`);
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

                // Handle Details (Validation Errors) or Specific Error Messages
                if (data.details || data.error) {
                    // 1. Details Object (Zod/Backend Validation)
                    if (data.details) {
                        const errorMessages: string[] = [];
                        // Recursive helper to extract errors from Zod format
                        const extractErrors = (obj: any): string[] => {
                            const messages: string[] = [];
                            if (obj._errors && Array.isArray(obj._errors)) {
                                messages.push(...obj._errors);
                            }
                            Object.keys(obj).forEach(key => {
                                if (typeof obj[key] === 'object' && obj[key] !== null && key !== '_errors') {
                                    messages.push(...extractErrors(obj[key]));
                                }
                            });
                            return messages;
                        };
                        errorMessages.push(...extractErrors(data.details));

                        [...new Set(errorMessages)].forEach(msg => {
                            toastManager.add({
                                title: "Erro de Validação",
                                description: msg,
                                type: 'error'
                            });
                        });
                    }

                    // 2. Single Error Message (e.g., 409 Conflict, 400 Bad Request)
                    if (data.error) {
                        toastManager.add({
                            title: status === 409 ? "Conflito / Indisponibilidade" : "Erro",
                            description: data.error,
                            type: 'error'
                        });
                    }

                } else {
                    // Generic Fallback
                    toastManager.add({
                        title: "Erro",
                        description: `Erro ${status}: Ocorreu um erro no servidor.`,
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

        const selectedEvent = events.find(e => e.id === formData.eventId);
        let duration = selectedEvent?.duration_minutes ?? 60;
        if (formData.type === 'Ligação SDR' && selectedEvent?.duration_minutes == null) duration = 30;

        const totalMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    };

    const endTime = calculateEndTime(formData.time);

    if (loading) return <div>Carregando...</div>;

    const getBrazilStats = () => {
        const now = new Date();

        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        const parts = formatter.formatToParts(now);
        const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

        const year = parseInt(getPart('year'));
        const month = parseInt(getPart('month')) - 1;
        const day = parseInt(getPart('day'));

        const todayDate = new Date(year, month, day);
        const todayStr = `${year}-${getPart('month')}-${getPart('day')}`;
        const nowTimeStr = `${getPart('hour')}:${getPart('minute')}`;

        // Calculate minTime with 10 minute buffer
        const bufferDate = new Date(now.getTime() + 10 * 60000);
        const bufferParts = formatter.formatToParts(bufferDate);
        const getBufferPart = (type: string) => bufferParts.find(p => p.type === type)?.value || '';
        const minTimeStr = `${getBufferPart('hour')}:${getBufferPart('minute')}`;

        return { todayDate, todayStr, nowTimeStr, minTimeStr };
    };

    const { todayDate, todayStr, minTimeStr } = getBrazilStats();

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex border border-border rounded-lg bg-surface shadow-sm overflow-hidden">
                <div className="flex-1 p-6 space-y-4 min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Row 2: Telefone (First) and Aluno */}
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

                        {/* Row 1: Evento and Tipo */}
                        <FloatingSelect
                            label="Evento"
                            value={formData.eventId}
                            onChange={(e: any) => {
                                setFormData({ ...formData, eventId: e.target.value });
                                if (errors.eventId) setErrors(prev => ({ ...prev, eventId: '' }));
                            }}
                            onBlur={() => {
                                if (!formData.eventId) {
                                    setErrors(prev => ({ ...prev, eventId: 'Evento é obrigatório' }));
                                }
                            }}
                            options={eventOptions}
                            disabled={isEditing}
                            error={errors.eventId}
                        />
                        <div className="space-y-1">
                            <FloatingSelect
                                label="Tipo"
                                value={formData.type}
                                onChange={(e: any) => {
                                    const newType = e.target.value as AppointmentType;
                                    if (newType === 'Reagendamento Closer' && formData.phone) {
                                        if (!checkEligibility(formData.phone)) {
                                            toastManager.add({
                                                title: "Permissão Negada",
                                                description: "Este cliente não possui um histórico para realizar um reagendamento.",
                                                type: 'error'
                                            });
                                            return;
                                        }
                                    }
                                    setFormData({ ...formData, type: newType });
                                    if (errors.type) setErrors(prev => ({ ...prev, type: '' }));
                                }}
                                onBlur={() => {
                                    if (!formData.type) {
                                        setErrors(prev => ({ ...prev, type: 'Tipo de agendamento é obrigatório' }));
                                    }
                                }}
                                options={[...allowedTypes]}
                                disabled={isEditing}
                                error={errors.type}
                            />
                            {['Reagendamento Closer', 'Fora da agenda'].includes(formData.type) && !formData.phone && (
                                <p className="text-xs text-amber-500 font-medium ml-1">
                                    * Preencha o cliente primeiro para liberar a data
                                </p>
                            )}
                        </div>

                        {/* Row 2: Data and Horário */}
                        <FloatingDateInput
                            label="Data"
                            value={formData.date}
                            onChange={(e: any) => setFormData({ ...formData, date: e.target.value })}
                            minDate={formData.type === 'Fora da agenda' ? undefined : todayDate}
                            disabled={
                                isEditing ||
                                !formData.eventId ||
                                !formData.type ||
                                (['Reagendamento Closer', 'Fora da agenda'].includes(formData.type) && (!formData.phone || !formData.lead))
                            }
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <TimePickerInput
                                label="Horário"
                                value={formData.time}
                                onChange={(time) => setFormData({ ...formData, time })}
                                minTime={(formData.type !== 'Fora da agenda' && formData.date === todayStr) ? minTimeStr : undefined}
                                disabled={
                                    isEditing ||
                                    !formData.date ||
                                    (['Reagendamento Closer', 'Fora da agenda'].includes(formData.type) && (!formData.phone || !formData.lead))
                                }
                                availableTimes={availableTimes}
                            />
                            <FloatingInput
                                label="Horário Final"
                                type="text"
                                value={endTime}
                                disabled
                                className="opacity-50 cursor-not-allowed"
                            />
                        </div>

                        {/* Row 3: Atendente and Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={!initialData ? "col-span-2" : ""}>
                                {(formData.type === 'Agendamento Pessoal' || formData.type === 'Onboarding') && (user?.sector === 'Tribo' || user?.sector === 'Aldeia') && !initialData && user ? (
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
                                        onChange={(e: any) => {
                                            setFormData({ ...formData, attendantId: e.target.value });
                                            if (errors.attendantId) setErrors(prev => ({ ...prev, attendantId: '' }));
                                        }}
                                        onBlur={() => {
                                            if (!formData.attendantId) {
                                                setErrors(prev => ({ ...prev, attendantId: 'Atendente é obrigatório' }));
                                            }
                                        }}
                                        options={attendantOptions}
                                        disabled={
                                            isEditing
                                                ? !(user && ['Co-Líder', 'Líder', 'Admin', 'Dev', 'Qualidade'].includes(user.role))
                                                : (formData.type !== 'Fora da agenda' && formData.type !== 'Upgrade')
                                        }
                                        error={errors.attendantId}
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
                                            user.id !== initialData.createdBy &&
                                            user.id !== initialData.attendantId &&
                                            !['Líder', 'Co-Líder', 'Admin', 'Dev', 'Qualidade', 'Suporte'].includes(user.role)
                                        ) || (
                                            user.role === 'Colaborador' &&
                                            user.sector === 'Closer' &&
                                            (initialData.status_edit_count || 0) >= 3
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

                        {/* Row 4: Google Meet (if editing) */}
                        {initialData && (
                            <FloatingInput
                                label="Google Meet"
                                value={formData.meetLink}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, meetLink: e.target.value })}
                                className="text-blue-500"
                                disabled={isEditing}
                            />
                        )}


                        {/* DIVIDER: Client Section */}
                        <div className="col-span-1 md:col-span-2 relative mt-4 mb-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-surface px-2 text-muted-foreground font-medium">
                                    Cliente
                                </span>
                            </div>
                        </div>

                        {/* Row 5: Telefone and Nome */}
                        <FloatingInput
                            label="Telefone"
                            value={formData.phone}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setFormData({ ...formData, phone: sanitizeInput.digits(e.target.value) });
                                if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                            }}
                            onBlur={() => {
                                if (!formData.phone) {
                                    setErrors(prev => ({ ...prev, phone: 'Telefone é obrigatório' }));
                                } else {
                                    handlePhoneBlur();
                                }
                            }}
                            required
                            error={errors.phone}
                            disabled={isEditing || isExistingClient}
                            maxLength={20}
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                        />
                        <FloatingInput
                            label="Nome"
                            value={formData.lead}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setFormData({ ...formData, lead: sanitizeInput.name(e.target.value) });
                                if (errors.lead) setErrors(prev => ({ ...prev, lead: '' }));
                            }}
                            onBlur={() => {
                                setFormData(prev => ({ ...prev, lead: prev.lead.trim() }));
                                if (!formData.lead.trim()) {
                                    setErrors(prev => ({ ...prev, lead: 'Nome é obrigatório' }));
                                }
                            }}
                            required
                            error={errors.lead}
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
                                if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                                if (isExistingClient && val !== formData.email) {
                                    setIsExistingClient(false);
                                }
                            }}
                            onBlur={() => {
                                let hasError = false;
                                if (!formData.email) {
                                    setErrors(prev => ({ ...prev, email: 'Email é obrigatório' }));
                                    hasError = true;
                                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                                    setErrors(prev => ({ ...prev, email: 'O campo de email precisa terminar com .com, .br, .net, .jp, etc' }));
                                    hasError = true;
                                }

                                if (!hasError) {
                                    fetchPurchaseHistory(formData.email);
                                }
                            }}
                            required // Keep required on main fields but handled manually too
                            error={errors.email}
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
                                            { value: 'JPY', label: 'JPY' },
                                            { value: 'AOA', label: 'KWZ' }
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
                                            // Check limits
                                            const clean = formatted.replace(/\./g, '').replace(',', '.');
                                            const num = parseFloat(clean);
                                            if (!isNaN(num) && num > 1000000) {
                                                return; // Prevent exceeding 1M
                                            }
                                            setFormData(prev => ({
                                                ...prev,
                                                studentProfile: {
                                                    ...prev.studentProfile,
                                                    financial: { ...prev.studentProfile.financial, amount: formatted }
                                                }
                                            }));
                                            if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                                        }}
                                        onBlur={() => {
                                            if (!formData.studentProfile.financial.amount) {
                                                setErrors(prev => ({ ...prev, amount: 'Valor do Perfil Financeiro é obrigatório' }));
                                            }
                                        }}
                                        disabled={isEditing}
                                        error={errors.amount}
                                    // required - Validation handled manually for better UX
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

                        {/* Row 6: Informações Adicionais */}
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
