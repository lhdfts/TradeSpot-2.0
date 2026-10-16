// Página pública de agendamento (/agendar/:link).
//
// Fluxo em dois passos, como em ferramentas de agenda (cal.com):
//   1. data e horário: calendário + só os horários livres do dia;
//   2. dados do aluno, com o resumo do horário e "Alterar".
// Desktop: coluna do evento à esquerda; no passo 1, calendário e horários lado
// a lado (layout inspirado no "Appointment Picker Calendar" do 21st.dev).
// Celular: tudo em sequência, rolando até os horários ao escolher o dia.
//
// Datas e horários são sempre de Brasília (o aluno pode estar em outro país).

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CalendarCheck, CalendarPlus, CheckCircle2, Clock, Download, Globe, Loader2, Pencil } from 'lucide-react';
import { FloatingInput } from '../../components/FloatingInput';
import { FloatingCountrySelect } from '../../components/FloatingCountrySelect';
import { Button, buttonVariants } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { isPreVendas } from '../../constants/sectors';
import { appointmentStart, brazilDateISO, brazilTimeHHmm, brazilTodayISO } from '../../lib/dates';
import { MonthCalendar } from './booking/MonthCalendar';
import { TimeSlots } from './booking/TimeSlots';
import { downloadIcs, googleCalendarUrl } from './booking/calendarLinks';

// Antecedência mínima para agendar (o servidor aplica a mesma regra).
const MIN_LEAD_MS = 10 * 60_000;
// Evento cuja confirmação mostra a política de cancelamento.
const RESTRICTED_EVENT_ID = 'c375b72f-85a5-4f2e-b99a-614d04e5b6fb';
// Brasília = UTC-3 (getTimezoneOffset devolve +180)
const BRT_OFFSET_MINUTES = 180;

interface PublicEvent {
    id: string;
    event_name: string;
    sector: string;
    duration?: number;
}

type Step = 'when' | 'details' | 'done';

// "Quinta-feira, 15 de outubro": maiúscula só no início (a classe CSS
// capitalize poria em todas as palavras, inclusive no "de").
const longDate = (iso: string) => {
    const text = new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const nextDayISO = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const durationLabel = (minutes: number) =>
    minutes % 60 === 0 ? `${minutes / 60} hora${minutes > 60 ? 's' : ''}` : `${minutes} minutos`;

// Aluno fora do fuso de Brasília: mostra também o horário dele.
const differentTimezone = typeof window !== 'undefined' && new Date().getTimezoneOffset() !== BRT_OFFSET_MINUTES;
const localTime = (date: string, time: string) =>
    new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', weekday: 'short' }).format(appointmentStart(date, time));

export const SelfScheduling = () => {
    const { link } = useParams<{ link: string }>();
    const [event, setEvent] = useState<PublicEvent | null>(null);
    const [loadingEvent, setLoadingEvent] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [step, setStep] = useState<Step>('when');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [availableTimes, setAvailableTimes] = useState<string[]>([]);
    const [loadingTimes, setLoadingTimes] = useState(false);

    const [form, setForm] = useState({ name: '', email: '', ddi: '+55', phone: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const cardRef = useRef<HTMLDivElement>(null);
    const slotsRef = useRef<HTMLDivElement>(null);
    const timesRequest = useRef(0);

    useEffect(() => {
        if (!link) return;
        (async () => {
            try {
                const response = await fetch(`/api/public/events/${link}`);
                if (!response.ok) throw new Error('Este link de agendamento não existe ou não está mais ativo.');
                const data: PublicEvent = await response.json();
                setEvent(data);
                document.title = `${data.event_name} · Agendamento`;
            } catch (err) {
                setLoadError(err instanceof Error ? err.message : 'Erro ao carregar o evento.');
            } finally {
                setLoadingEvent(false);
            }
        })();
    }, [link]);

    const todayBRT = brazilTodayISO();
    const duration = event?.duration ?? 60;

    // Horários que podem ser escolhidos: os livres no servidor, menos os que já
    // passaram (antecedência mínima, no relógio de Brasília) e, em Pré-vendas,
    // só :00 e :30.
    const minTimeFor = (day: string): string | undefined => {
        if (day !== todayBRT) return undefined;
        const earliest = Date.now() + MIN_LEAD_MS;
        return brazilDateISO(earliest) === todayBRT ? brazilTimeHHmm(earliest) : '24:00';
    };
    const minTime = minTimeFor(date);
    const selectableTimes = availableTimes.filter(t =>
        (!minTime || t >= minTime) &&
        (!isPreVendas(event?.sector) || t.endsWith(':00') || t.endsWith(':30'))
    );

    const loadTimes = async (day: string) => {
        if (!event) return;
        const request = ++timesRequest.current; // só a busca mais recente vale
        setLoadingTimes(true);
        try {
            const response = await fetch(`/api/public/available-times?date=${day}&eventId=${event.id}`);
            if (!response.ok) throw new Error();
            const data = await response.json();
            if (request === timesRequest.current) setAvailableTimes(data.availableTimes || []);
        } catch {
            if (request === timesRequest.current) setAvailableTimes([]);
        } finally {
            if (request === timesRequest.current) setLoadingTimes(false);
        }
    };

    const selectDate = (day: string) => {
        setDate(day);
        setTime('');
        setSubmitError(null);
        loadTimes(day);
        // Celular: os horários ficam abaixo do calendário
        requestAnimationFrame(() => {
            if (window.matchMedia('(max-width: 1023px)').matches) {
                slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    };

    const scrollToCard = () =>
        requestAnimationFrame(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

    const selectTime = (slot: string) => {
        setTime(slot);
        setSubmitError(null);
        setStep('details');
        scrollToCard();
    };

    const backToWhen = () => {
        setStep('when');
        scrollToCard();
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.name || form.name.trim().length < 2) newErrors.name = 'Informe seu nome completo';
        if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'E-mail inválido';
        const cleanPhone = form.phone.replace(/\D/g, '');
        if (form.ddi === '+55') {
            if (cleanPhone.length < 10 || cleanPhone.length > 11) newErrors.phone = 'Telefone inválido (10 ou 11 dígitos com DDD)';
        } else if (cleanPhone.length < 5) {
            newErrors.phone = 'Telefone inválido';
        }
        setErrors(newErrors);
        const valid = Object.keys(newErrors).length === 0;
        if (!valid) {
            // Leva ao primeiro campo com erro (no celular ele pode estar fora da tela)
            requestAnimationFrame(() => {
                const firstInvalid = cardRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
                firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstInvalid?.focus({ preventScroll: true });
            });
        }
        return valid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        if (!event || !validate()) return;

        // O horário pode ter passado enquanto o aluno preenchia os dados.
        if (appointmentStart(date, time) - Date.now() < MIN_LEAD_MS) {
            setSubmitError('Esse horário já não pode ser agendado (mínimo de 10 minutos de antecedência). Escolha outro.');
            setTime('');
            setStep('when');
            loadTimes(date);
            scrollToCard();
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch('/api/public/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead: form.name.trim(),
                    email: form.email.trim(),
                    phone: `${form.ddi.replace('+', '')}${form.phone.replace(/\D/g, '')}`,
                    date,
                    time,
                    eventId: event.id,
                    attendantId: 'distribuicao_automatica'
                })
            });
            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                let message: string = result.error || 'Não foi possível concluir o agendamento.';
                if (result.details) {
                    const fieldErrors = Object.values(result.details)
                        .map((d) => (d as { _errors?: string[] })?._errors?.[0])
                        .filter(Boolean);
                    if (fieldErrors.length > 0) message = `${message}: ${fieldErrors.join(' | ')}`;
                }
                // Horário tomado por outra pessoa: volta à escolha com a lista atualizada.
                if (response.status === 409 && /hor[aá]rio|preenchido|dispon/i.test(message)) {
                    setSubmitError(message);
                    setTime('');
                    setStep('when');
                    loadTimes(date);
                    scrollToCard();
                    return;
                }
                throw new Error(message);
            }

            setStep('done');
            scrollToCard();
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Falha ao processar o agendamento.');
        } finally {
            setSubmitting(false);
        }
    };

    // ---------------------------------------------------------------- estados

    if (loadingEvent) {
        return (
            <div className="w-full max-w-md mx-auto bg-card rounded-xl border border-border flex flex-col items-center justify-center p-12 gap-4" role="status">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando agenda...</p>
            </div>
        );
    }

    if (loadError || !event) {
        return (
            <div className="w-full max-w-md mx-auto bg-card rounded-xl border border-border p-8 text-center space-y-3 animate-blur-fade">
                <div className="mx-auto size-12 bg-red-500/10 rounded-full grid place-items-center">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <h2 className="text-lg font-semibold">Agenda indisponível</h2>
                <p className="text-sm text-muted-foreground">{loadError}</p>
            </div>
        );
    }

    const start = date && time ? appointmentStart(date, time) : 0;
    const calendarEvent = {
        title: event.event_name,
        start,
        end: start + duration * 60_000,
        details: `Agendamento TradeStars. Os detalhes de acesso foram enviados para ${form.email}.`,
    };

    // ------------------------------------------------------------------ layout

    return (
        <div
            ref={cardRef}
            className="w-full max-w-md md:max-w-5xl mx-auto bg-card rounded-xl border border-border overflow-hidden grid md:grid-cols-[260px_1fr] scroll-mt-4 animate-blur-fade"
        >
            {/* Evento e resumo */}
            <aside className="p-5 sm:p-6 border-b md:border-b-0 md:border-r border-border space-y-4 bg-slate-50">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Agendamento</p>
                    <h1 className="text-xl font-bold text-foreground mt-1 break-words">{event.event_name}</h1>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                        <Clock size={16} className="shrink-0" /> {durationLabel(duration)}
                    </li>
                    <li className="flex items-start gap-2">
                        <Globe size={16} className="shrink-0 mt-0.5" />
                        <span>
                            Horário de Brasília (BRT)
                            {differentTimezone && <span className="block text-xs">Mostramos também o horário do seu fuso.</span>}
                        </span>
                    </li>
                    {date && time && (
                        <li className="flex items-start gap-2 text-foreground font-medium animate-in fade-in slide-in-from-left-2 duration-300">
                            <CalendarCheck size={16} className="shrink-0 mt-0.5 text-primary" />
                            <span>
                                {longDate(date)} às {time}
                                {differentTimezone && (
                                    <span className="block text-xs font-normal text-muted-foreground">Seu horário: {localTime(date, time)}</span>
                                )}
                            </span>
                        </li>
                    )}
                </ul>

                {/* Passos */}
                {step !== 'done' && (
                    <ol className="hidden md:flex flex-col gap-2 pt-4 border-t border-border text-sm" aria-label="Etapas">
                        {[{ id: 'when', label: 'Data e horário' }, { id: 'details', label: 'Seus dados' }].map((s, i) => {
                            const active = step === s.id;
                            const done = step === 'details' && s.id === 'when';
                            return (
                                <li key={s.id} className={cn('flex items-center gap-2', active ? 'text-foreground font-semibold' : 'text-muted-foreground')} aria-current={active ? 'step' : undefined}>
                                    <span className={cn(
                                        'size-6 grid place-items-center rounded-full text-xs font-bold transition-colors',
                                        active || done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                    )}>
                                        {done ? '✓' : i + 1}
                                    </span>
                                    {s.label}
                                </li>
                            );
                        })}
                    </ol>
                )}
            </aside>

            <div className="p-5 sm:p-6 min-w-0">
                {submitError && step !== 'done' && (
                    <div className="mb-5 p-3 bg-red-500/10 text-destructive rounded-lg flex items-start gap-2 text-sm animate-in fade-in slide-in-from-top-1" role="alert">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">{submitError}</span>
                    </div>
                )}

                {/* Passo 1: data e horário */}
                {step === 'when' && (
                    <div key="when" className="grid lg:grid-cols-[1fr_220px] gap-6 lg:gap-0 animate-fade-up">
                        <div className="lg:pr-6">
                            <h2 className="text-base font-semibold text-foreground mb-4">Escolha uma data</h2>
                            <MonthCalendar value={date} onChange={selectDate} minDate={todayBRT} />
                        </div>
                        <div ref={slotsRef} className="lg:pl-6 lg:border-l border-border scroll-mt-4 min-w-0">
                            <h2 className="text-base font-semibold text-foreground mb-4">
                                {date ? longDate(date) : 'Horários'}
                            </h2>
                            {date ? (
                                // No desktop a coluna rola sozinha, na altura do calendário
                                <div className="lg:max-h-[360px] lg:overflow-y-auto lg:pr-1 -mr-1">
                                    <TimeSlots
                                        times={selectableTimes}
                                        loading={loadingTimes}
                                        value={time}
                                        onSelect={selectTime}
                                        onNextDay={() => selectDate(nextDayISO(date))}
                                    />
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Selecione um dia no calendário para ver os horários livres.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Passo 2: dados */}
                {step === 'details' && (
                    <form key="details" onSubmit={handleSubmit} noValidate className="space-y-5 max-w-lg animate-fade-up">
                        <button type="button" onClick={backToWhen} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft size={16} /> Voltar
                        </button>

                        {/* Resumo com atalho para trocar */}
                        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[#000AFF]/30 bg-[#000AFF]/5">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">{longDate(date)}</p>
                                <p className="text-sm text-muted-foreground">
                                    {time} (Brasília){differentTimezone && ` · seu horário: ${localTime(date, time)}`}
                                </p>
                            </div>
                            <button type="button" onClick={backToWhen} className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                                <Pencil size={14} /> Alterar
                            </button>
                        </div>

                        <div>
                            <h2 className="text-base font-semibold text-foreground">Seus dados</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Vamos enviar a confirmação para o seu e-mail.</p>
                        </div>

                        <FloatingInput
                            label="Nome completo"
                            name="name"
                            autoComplete="name"
                            autoCapitalize="words"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            error={errors.name}
                        />
                        <FloatingInput
                            label="E-mail"
                            type="email"
                            name="email"
                            autoComplete="email"
                            inputMode="email"
                            autoCapitalize="none"
                            spellCheck={false}
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            error={errors.email}
                        />
                        <div className="flex gap-3">
                            <div className="w-[120px] sm:w-[130px] shrink-0">
                                <FloatingCountrySelect label="DDI" value={form.ddi} onChange={(val) => setForm({ ...form, ddi: val })} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <FloatingInput
                                    label="Telefone (com DDD)"
                                    type="tel"
                                    name="tel"
                                    autoComplete="tel-national"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={form.phone}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/\D/g, '');
                                        // Limita só para o Brasil: outros países têm tamanhos variados
                                        if (form.ddi === '+55' && val.length > 11) val = val.slice(0, 11);
                                        setForm({ ...form, phone: val });
                                    }}
                                    error={errors.phone}
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            {submitting ? 'Confirmando...' : 'Confirmar agendamento'}
                        </Button>
                    </form>
                )}

                {/* Confirmação */}
                {step === 'done' && (
                    <div key="done" className="max-w-lg mx-auto text-center py-4 sm:py-8 space-y-5 animate-blur-fade">
                        <div className="mx-auto size-16 bg-green-500/10 rounded-full grid place-items-center animate-in zoom-in-50 duration-500">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold">Agendamento confirmado!</h2>
                            <p className="text-muted-foreground mt-2">
                                Obrigado, <strong className="text-foreground">{form.name.trim().split(' ')[0]}</strong>. Enviamos os detalhes para{' '}
                                <strong className="text-foreground break-words">{form.email}</strong>.
                            </p>
                        </div>

                        <div className="rounded-xl border border-border bg-slate-50 p-4 text-left">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{event.event_name}</p>
                            <p className="text-lg font-semibold text-foreground mt-1">{longDate(date)}</p>
                            <p className="text-sm text-muted-foreground">
                                {time} (Brasília) · {durationLabel(duration)}
                                {differentTimezone && <span className="block">Seu horário: {localTime(date, time)}</span>}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            <a
                                href={googleCalendarUrl(calendarEvent)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(buttonVariants(), 'h-11')}
                            >
                                <CalendarPlus size={16} className="mr-2" /> Adicionar ao Google Agenda
                            </a>
                            <Button variant="outline" className="h-11" onClick={() => downloadIcs(calendarEvent)}>
                                <Download size={16} className="mr-2" /> Baixar convite (.ics)
                            </Button>
                        </div>

                        {event.id === RESTRICTED_EVENT_ID && (
                            <div className="text-left border border-amber-400 bg-amber-50 rounded-lg p-4 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-amber-800">Política de Cancelamento</p>
                                    <p className="text-sm text-amber-700">
                                        Caso precise cancelar ou reagendar, solicite com pelo menos <strong>24 horas de antecedência</strong> diretamente pelo canal do <strong>Suporte Prisma</strong>.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
