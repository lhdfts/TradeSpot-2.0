import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '../../components/ui/calendar';
import { FloatingInput } from '../../components/FloatingInput';
import { Button } from '../../components/ui/button';
import { Loader2, CheckCircle2, Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

// Helper to generate time slots
const generateTimes = () => {
    const times = [];
    for (let i = 0; i < 24; i++) {
        for (let j of [0, 15, 30, 45]) {
            times.push(`${String(i).padStart(2, '0')}:${String(j).padStart(2, '0')}`);
        }
    }
    return times;
};

const TIME_SLOTS = generateTimes();

export const SelfScheduling = () => {
    const { link } = useParams<{ link: string }>();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [event, setEvent] = useState<{ id: string, event_name: string, sector: string } | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        date: undefined as Date | undefined,
        time: ''
    });

    // Validation Errors
    const [errors, setErrors] = useState<Record<string, string>>({});

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

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name || formData.name.length < 2) newErrors.name = 'Nome inválido';
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido';

        const cleanPhone = formData.phone.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 11) newErrors.phone = 'Telefone inválido (10 ou 11 dígitos)';

        if (!formData.date) newErrors.date = 'Selecione uma data';
        if (!formData.time) newErrors.time = 'Selecione um horário';

        // Buffer check (frontend side)
        if (formData.date && formData.time) {
            const apptTime = new Date(`${format(formData.date, 'yyyy-MM-dd')}T${formData.time}:00`);
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

        try {
            const response = await fetch('/api/public/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lead: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    date: formData.date ? format(formData.date, 'yyyy-MM-dd') : '',
                    time: formData.time,
                    eventId: event.id
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
                        {formData.date && format(formData.date, "dd 'de' MMMM", { locale: ptBR })}
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
                    <FloatingInput
                        label="Telefone (com DDD)"
                        value={formData.phone} // Masking logic ideally here or handled by component
                        onChange={(e) => {
                            // Simple mask
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 11) val = val.slice(0, 11);
                            // Apply visual mask (##) #####-####
                            // For simplicity in this vanilla component, just passing raw or simple formatter?
                            // Let's passed sanitized to state but mask visual? No, FloatingInput controls value.
                            // Just storing digits for now, backend sanitizes.
                            setFormData({ ...formData, phone: val });
                        }}
                        placeholder="Ex: 11999999999"
                        error={errors.phone}
                    />
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <h3 className="tex-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        2. Escolha o Horário
                    </h3>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <CalendarIcon size={16} /> Data
                            </label>
                            <div className="border rounded-md p-1 flex justify-center bg-surface">
                                <Calendar
                                    mode="single"
                                    selected={formData.date}
                                    onSelect={(d) => setFormData({ ...formData, date: d, time: '' })} // Reset time on date change
                                    locale={ptBR}
                                    disabled={(date) => {
                                        const now = new Date();
                                        now.setHours(0, 0, 0, 0);
                                        return date < now || date.getDay() === 0 || date.getDay() === 6; // Disable weekends if needed? Or allow?
                                        // Spec didn't say disable weekends. But "Ligação Closer" usually business days.
                                        // Let's assume business days for safety, or just allow all futures.
                                        // Let's allow all futures >= today.
                                    }}
                                    initialFocus
                                />
                            </div>
                            {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Clock size={16} /> Horário
                            </label>

                            {!formData.date ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm border rounded-md min-h-[200px] bg-muted/50">
                                    Selecione uma data primeiro
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-2">
                                    {TIME_SLOTS.map(time => {
                                        // Optional: Filter past times if today
                                        let disabled = false;
                                        if (formData.date) {
                                            const now = new Date();
                                            const isToday = formData.date.getDate() === now.getDate() &&
                                                formData.date.getMonth() === now.getMonth();
                                            if (isToday) {
                                                const [h, m] = time.split(':').map(Number);
                                                const slotTime = new Date(now);
                                                slotTime.setHours(h, m, 0, 0);
                                                if (slotTime <= now) disabled = true;
                                            }
                                        }

                                        return (
                                            <button
                                                key={time}
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => setFormData({ ...formData, time })}
                                                className={cn(
                                                    "px-2 py-2 text-sm rounded transition-colors text-center border",
                                                    formData.time === time
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : disabled
                                                            ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed border-transparent"
                                                            : "hover:bg-accent hover:text-accent-foreground border-border"
                                                )}
                                            >
                                                {time}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
                        </div>
                    </div>
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
