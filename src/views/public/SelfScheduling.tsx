import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FloatingDateInput } from '../../components/FloatingDateInput';
import { TimePickerInput } from '../../components/TimePickerInput';
import { FloatingInput } from '../../components/FloatingInput';
import { Button } from '../../components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { FloatingCountrySelect } from '../../components/FloatingCountrySelect';

export const SelfScheduling = () => {
    const { link } = useParams<{ link: string }>();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingTimes, setLoadingTimes] = useState(false);

    const [event, setEvent] = useState<{ id: string, event_name: string, sector: string } | null>(null);

    // Available times from backend
    const [availableTimes, setAvailableTimes] = useState<string[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        ddi: '+55',
        phone: '',
        date: '',
        time: ''
    });

    // Validation Errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [searchParams] = useSearchParams();

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                // Use relative path for production/dev proxy compatibility
                const response = await fetch(`/api/public/events/${link}`);
                if (!response.ok) {
                    throw new Error('Evento não encontrado ou expirado');
                }
                const data = await response.json();
                setEvent(data);
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar evento');
            } finally {
                setLoading(false);
            }
        };

        if (link) {
            fetchEvent();
        }
    }, [link]);

    // Fetch available times when date changes
    useEffect(() => {
        const fetchAvailableTimes = async () => {
            if (!formData.date) {
                setAvailableTimes([]);
                return;
            }

            setLoadingTimes(true);
            try {
                const response = await fetch(`/api/public/available-times?date=${formData.date}`);
                if (!response.ok) {
                    throw new Error('Erro ao buscar horários');
                }
                const data = await response.json();
                setAvailableTimes(data.availableTimes || []);
            } catch (err: any) {
                console.error("Error fetching available times:", err);
                setAvailableTimes([]);
            } finally {
                setLoadingTimes(false);
            }
        };

        fetchAvailableTimes();
    }, [formData.date]);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name || formData.name.length < 2) newErrors.name = 'Nome inválido';
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido';

        const cleanPhone = formData.phone.replace(/\D/g, '');
        if (formData.ddi === '+55') {
            if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 11) newErrors.phone = 'Telefone inválido (10 ou 11 dígitos)';
        } else {
            if (!cleanPhone || cleanPhone.length < 5) newErrors.phone = 'Telefone inválido';
        }

        if (!formData.date) newErrors.date = 'Selecione uma data';
        if (!formData.time) newErrors.time = 'Selecione um horário';

        // Buffer check (frontend side)
        if (formData.date && formData.time) {
            const apptTime = new Date(`${formData.date}T${formData.time}:00`);
            const now = new Date();
            const diff = (apptTime.getTime() - now.getTime()) / 60000;
            if (diff < 10) {
                newErrors.time = 'Agendamento deve ser futuro (mínimo 10 min)';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validate()) return;
        if (!event) return;

        setSubmitting(true);

        const attendantId = searchParams.get('attendantId');

        try {
            const response = await fetch('/api/public/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lead: formData.name,
                    email: formData.email,
                    phone: `${formData.ddi.replace('+', '')}${formData.phone.replace(/\D/g, '')}`,
                    date: formData.date,
                    time: formData.time,
                    eventId: event.id,
                    attendantId: attendantId || 'distribuicao_automatica'
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao realizar agendamento');
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Falha ao processar agendamento');
            // Scroll to top to see error
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Carregando informações...</p>
            </div>
        );
    }

    if (error && !event) {
        return (
            <div className="p-8 text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold">Algo deu errado</h2>
                <p className="text-muted-foreground">{error}</p>
            </div>
        );
    }

    if (success) {
        return (
            <div className="p-12 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold">Agendamento Realizado!</h2>
                <p className="text-muted-foreground">
                    Obrigado, <strong>{formData.name}</strong>.
                    <br />
                    Seu agendamento para <strong>{event?.event_name}</strong> foi confirmado.
                </p>
                <div className="bg-muted p-4 rounded-lg inline-block text-left mx-auto min-w-[200px]">
                    <p className="text-sm text-secondary">Data e Hora:</p>
                    <p className="font-semibold text-lg">
                        {formData.date && format(new Date(formData.date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                        {' às '}
                        {formData.time}
                    </p>
                </div>
                <p className="text-sm text-muted-foreground">
                    Enviamos os detalhes para {formData.email}
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8">
            <div className="mb-8 text-center border-b pb-6">
                <h1 className="text-2xl font-bold mb-2">{event?.event_name}</h1>
                <p className="text-muted-foreground">Preencha seus dados para agendar sua participação.</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <h3 className="tex-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        1. Seus Dados
                    </h3>
                    <FloatingInput
                        label="Nome Completo"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={errors.name}
                    />
                    <FloatingInput
                        label="E-mail"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        error={errors.email}
                    />
                    <div className="flex gap-3">
                        <div className="w-[130px] flex-shrink-0">
                            <FloatingCountrySelect
                                label="DDI"
                                value={formData.ddi}
                                onChange={(val) => setFormData({ ...formData, ddi: val })}
                            />
                        </div>
                        <div className="flex-1">
                            <FloatingInput
                                label="Telefone"
                                value={formData.phone}
                                onChange={(e) => {
                                    let val = e.target.value.replace(/\D/g, '');
                                    // Limit length only for BR to avoid weird UX for other countries
                                    if (formData.ddi === '+55' && val.length > 11) val = val.slice(0, 11);
                                    setFormData({ ...formData, phone: val });
                                }}
                                placeholder={formData.ddi === '+55' ? "" : ""}
                                error={errors.phone}
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        2. Escolha o Horário
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FloatingDateInput
                            label="Data"
                            value={formData.date}
                            onChange={(e: any) => setFormData({ ...formData, date: e.target.value, time: '' })}
                            minDate={new Date()}
                            error={errors.date ? { message: errors.date } : undefined}
                        />
                        <TimePickerInput
                            label={loadingTimes ? "Carregando..." : "Horário"}
                            value={formData.time}
                            onChange={(time) => setFormData({ ...formData, time })}
                            availableTimes={availableTimes}
                            disabled={!formData.date || loadingTimes}
                            // Optional: disable past times if today
                            minTime={
                                formData.date === format(new Date(), 'yyyy-MM-dd')
                                    ? format(new Date(new Date().getTime() + 10 * 60000), 'HH:mm')
                                    : undefined
                            }
                            hideUnavailable={true}
                            pickerGridClass="grid-cols-3 md:grid-cols-4"
                        />
                    </div>
                    {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
                </div>

                <div className="pt-6">
                    <Button
                        type="submit"
                        className="w-full h-12 text-lg"
                        disabled={submitting}
                    >
                        {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        {submitting ? 'Confirmando...' : 'Confirmar Agendamento'}
                    </Button>
                </div>
            </form>
        </div>
    );
};
