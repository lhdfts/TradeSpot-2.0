// Página pública de agendamento (/agendar/:link).
//
// Fluxo em dois passos, como em ferramentas de agenda (cal.com):
//   1. data e horário: calendário (só dias com horário livre) + horários do dia;
//   2. dados do aluno, com o resumo do horário e "Alterar".
// Desktop: coluna do evento à esquerda; no passo 1, calendário e horários lado
// a lado (layout inspirado no "Appointment Picker Calendar" do 21st.dev).
// Celular: tudo em sequência, rolando até os horários ao escolher o dia.
//
// Datas e horários são sempre de Brasília (o aluno pode estar em outro país).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CalendarCheck, CalendarPlus, Clock, Download, Globe, Loader2, Lock, Mail, Pencil, RotateCcw } from 'lucide-react';
import { FloatingInput } from '../../components/FloatingInput';
import { FloatingCountrySelect } from '../../components/FloatingCountrySelect';
import { Button, buttonVariants } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { isPreVendas } from '../../constants/sectors';
import { appointmentStart, brazilDateISO, brazilTimeHHmm, brazilTodayISO } from '../../lib/dates';
import { MonthCalendar } from './booking/MonthCalendar';
import { TimeSlots } from './booking/TimeSlots';
import { BrandStar } from './booking/BrandStar';
import { downloadIcs, googleCalendarUrl } from './booking/calendarLinks';

// Antecedência mínima para agendar: a mesma do servidor (POST /api/public/appointments
// e /available-days usam 30 minutos; CS e SDR têm regras próprias lá).
const MIN_LEAD_MS = 30 * 60_000;
// Até quantos dias à frente o calendário oferece (o servidor aceita até 180).
const BOOKING_WINDOW_DAYS = 60;
// Brasília = UTC-3 (getTimezoneOffset devolve +180)
const BRT_OFFSET_MINUTES = 180;

// Política de cancelamento mostrada na confirmação, por evento (id do evento).
// Fica aqui enquanto o banco não tiver um campo próprio em events (exigiria migração).
const CANCELLATION_POLICIES: Record<string, React.ReactNode> = {
    // Evento restrito (mesmo id de RESTRICTED_EVENT_ID no servidor)
    'c375b72f-85a5-4f2e-b99a-614d04e5b6fb': (
        <>
            Caso precise cancelar ou reagendar, solicite com pelo menos <strong>24 horas de antecedência</strong> diretamente pelo canal do <strong>Suporte Prisma</strong>.
        </>
    ),
};

// Campos do servidor (zod) → campos do formulário
const SERVER_FIELD_MAP: Record<string, 'name' | 'email' | 'phone'> = { lead: 'name', email: 'email', phone: 'phone' };
const GENERIC_SUBMIT_ERROR = 'Não conseguimos confirmar seu agendamento. Confira os dados e tente de novo.';

// Transição de cor padrão (mesma curva do resto do app)
const COLOR_TRANSITION = 'transition-[background-color,border-color,color] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]';

interface PublicEvent {
    id: string;
    event_name: string;
    sector: string;
    duration?: number;
}

type Step = 'when' | 'details' | 'done';
type LoadError = 'unavailable' | 'network';

// "Quinta-feira, 15 de outubro": maiúscula só no início (a classe CSS
// capitalize poria em todas as palavras, inclusive no "de").
const longDate = (iso: string) => {
    const text = new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const addDaysISO = (iso: string, days: number) => {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Meses ("YYYY-MM") de `from` até `to`, inclusive.
const monthsBetween = (from: string, to: string) => {
    const months: string[] = [];
    let y = Number(from.slice(0, 4));
    let m = Number(from.slice(5, 7));
    const end = to.slice(0, 7);
    for (;;) {
        const key = `${y}-${String(m).padStart(2, '0')}`;
        if (key > end) break;
        months.push(key);
        if (++m > 12) { m = 1; y++; }
    }
    return months;
};

const durationLabel = (minutes: number) =>
    minutes % 60 === 0 ? `${minutes / 60} hora${minutes > 60 ? 's' : ''}` : `${minutes} minutos`;

// Aluno fora do fuso de Brasília: mostra também o horário dele.
const differentTimezone = typeof window !== 'undefined' && new Date().getTimezoneOffset() !== BRT_OFFSET_MINUTES;
const localTime = (date: string, time: string) =>
    new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', weekday: 'short' }).format(appointmentStart(date, time));

// Esqueleto com o mesmo formato do cartão final (evita o "pulo" de largura).
const BookingSkeleton = () => (
    <div
        className="w-full max-w-md md:max-w-5xl mx-auto bg-card rounded-xl border border-border overflow-hidden grid md:grid-cols-[260px_1fr]"
        role="status"
        aria-label="Carregando agenda"
    >
        <div className="p-5 sm:p-6 border-b md:border-b-0 md:border-r border-border space-y-4 bg-primary/[0.03]">
            <div className="h-3 w-24 rounded bg-muted animate-shimmer" />
            <div className="h-6 w-3/4 rounded bg-muted animate-shimmer" />
            <div className="space-y-2 pt-1">
                <div className="h-4 w-20 rounded bg-muted animate-shimmer" />
                <div className="h-4 w-40 rounded bg-muted animate-shimmer" />
            </div>
        </div>
        <div className="p-5 sm:p-6 grid lg:grid-cols-[1fr_220px] gap-6 lg:gap-0">
            <div className="lg:pr-6 space-y-4">
                <div className="h-5 w-36 rounded bg-muted animate-shimmer" />
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 35 }, (_, i) => (
                        <div key={i} className="aspect-square max-h-11 rounded-lg bg-muted animate-shimmer" />
                    ))}
                </div>
            </div>
            <div className="hidden lg:block lg:pl-6 lg:border-l border-border space-y-2">
                <div className="h-5 w-28 rounded bg-muted animate-shimmer mb-4" />
                {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="h-11 rounded-lg bg-muted animate-shimmer" />
                ))}
            </div>
        </div>
        <span className="sr-only">Carregando agenda...</span>
    </div>
);

export const SelfScheduling = () => {
    const { link } = useParams<{ link: string }>();
    const [event, setEvent] = useState<PublicEvent | null>(null);
    const [loadingEvent, setLoadingEvent] = useState(true);
    const [loadError, setLoadError] = useState<LoadError | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const [step, setStep] = useState<Step>('when');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [availableTimes, setAvailableTimes] = useState<string[]>([]);
    const [loadingTimes, setLoadingTimes] = useState(false);

    // Dias com horário livre por mês ("YYYY-MM" → dias; null = a busca falhou)
    const [viewMonth, setViewMonth] = useState('');
    const [daysByMonth, setDaysByMonth] = useState<Record<string, string[] | null>>({});
    const [noAvailability, setNoAvailability] = useState(false);
    const daysRequests = useRef(new Map<string, Promise<string[] | null>>());

    const [form, setForm] = useState({ name: '', email: '', ddi: '+55', phone: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const cardRef = useRef<HTMLDivElement>(null);
    const slotsRef = useRef<HTMLDivElement>(null);
    const timesRequest = useRef(0);

    useEffect(() => {
        if (!link) return;
        setLoadingEvent(true);
        setLoadError(null);
        (async () => {
            try {
                const response = await fetch(`/api/public/events/${link}`);
                if (!response.ok) {
                    // 4xx: link inexistente ou evento desativado; 5xx: falha nossa
                    setLoadError(response.status >= 500 ? 'network' : 'unavailable');
                    return;
                }
                const data: PublicEvent = await response.json();
                setEvent(data);
                document.title = `${data.event_name} · Agendamento TradeStars`;
            } catch {
                setLoadError('network');
            } finally {
                setLoadingEvent(false);
            }
        })();
    }, [link, reloadKey]);

    const todayBRT = brazilTodayISO();
    const maxDate = addDaysISO(todayBRT, BOOKING_WINDOW_DAYS);
    const duration = event?.duration ?? 60;

    // Busca (uma vez por mês) os dias com horário livre.
    const fetchDays = useCallback((month: string): Promise<string[] | null> => {
        if (!event) return Promise.resolve(null);
        const cached = daysRequests.current.get(month);
        if (cached) return cached;
        const request = (async () => {
            try {
                const response = await fetch(`/api/public/available-days?eventId=${event.id}&month=${month}`);
                if (!response.ok) throw new Error();
                const data: { days?: string[] } = await response.json();
                return data.days ?? [];
            } catch {
                // Sem a lista, o calendário volta a habilitar todos os dias da janela
                daysRequests.current.delete(month);
                return null;
            }
        })();
        daysRequests.current.set(month, request);
        request.then(days => setDaysByMonth(prev => ({ ...prev, [month]: days })));
        return request;
    }, [event]);

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

    const selectDate = (day: string, scroll = true) => {
        setDate(day);
        setTime('');
        setSubmitError(null);
        setViewMonth(day.slice(0, 7));
        loadTimes(day);
        // Celular: os horários ficam abaixo do calendário
        if (!scroll) return;
        requestAnimationFrame(() => {
            if (window.matchMedia('(max-width: 1023px)').matches) {
                slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    };

    // Ao abrir: vai direto ao primeiro dia com horário livre na janela.
    useEffect(() => {
        if (!event) return;
        let cancelled = false;
        const months = monthsBetween(todayBRT, maxDate);
        // A janela tem no máximo 3 meses: busca todos em paralelo (o "próximo dia
        // com horários" e a navegação já encontram as listas prontas).
        months.forEach(m => { void fetchDays(m); });
        (async () => {
            for (const month of months) {
                const days = await fetchDays(month);
                if (cancelled) return;
                if (days === null) break; // sem a lista: o aluno escolhe livremente
                if (days.length > 0) {
                    selectDate(days[0], false);
                    return;
                }
            }
            if (cancelled) return;
            setViewMonth(months[0]);
            // Só afirma "sem horários" se todas as buscas responderam
            setNoAvailability(months.every(m => (daysRequests.current.has(m))));
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event]);

    // Mês navegado ainda não buscado
    useEffect(() => {
        if (viewMonth && !(viewMonth in daysByMonth)) fetchDays(viewMonth);
    }, [viewMonth, daysByMonth, fetchDays]);

    const monthDays = viewMonth ? daysByMonth[viewMonth] : undefined;
    const availableDaysSet = monthDays ? new Set(monthDays) : null;
    const loadingMonth = !viewMonth || monthDays === undefined;

    // Próximo dia com horário depois de `day`, entre os meses já buscados; sem
    // as listas, o dia seguinte dentro da janela.
    const nextAvailableDay = (day: string): string | undefined => {
        const known = Object.entries(daysByMonth);
        if (known.length === 0 || known.some(([, days]) => days === null)) {
            const next = addDaysISO(day, 1);
            return next <= maxDate ? next : undefined;
        }
        return known
            .flatMap(([, days]) => days ?? [])
            .filter(d => d > day && d <= maxDate)
            .sort()[0];
    };
    const nextDay = date ? nextAvailableDay(date) : undefined;

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

    const focusFirstInvalid = () =>
        // Leva ao primeiro campo com erro (no celular ele pode estar fora da tela)
        requestAnimationFrame(() => {
            const firstInvalid = cardRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
            firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalid?.focus({ preventScroll: true });
        });

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.name || form.name.trim().length < 2) newErrors.name = 'Digite seu nome completo';
        if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Digite um e-mail como nome@exemplo.com';
        const cleanPhone = form.phone.replace(/\D/g, '');
        if (form.ddi === '+55') {
            if (cleanPhone.length < 10 || cleanPhone.length > 11) newErrors.phone = 'Digite o telefone com DDD';
        } else if (cleanPhone.length < 5) {
            newErrors.phone = 'Digite o telefone completo';
        }
        setErrors(newErrors);
        const valid = Object.keys(newErrors).length === 0;
        if (!valid) focusFirstInvalid();
        return valid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        if (!event || !validate()) return;

        // O horário pode ter passado enquanto o aluno preenchia os dados.
        if (appointmentStart(date, time) - Date.now() < MIN_LEAD_MS) {
            setSubmitError('Esse horário já não pode ser agendado (mínimo de 30 minutos de antecedência). Escolha outro.');
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
                const serverMessage: string = typeof result.error === 'string' ? result.error : '';

                // Horário tomado por outra pessoa: volta à escolha com a lista atualizada.
                if (response.status === 409 && /hor[aá]rio|preenchido|dispon/i.test(serverMessage)) {
                    setSubmitError(serverMessage);
                    setTime('');
                    setStep('when');
                    loadTimes(date);
                    scrollToCard();
                    return;
                }

                // Erros de validação do servidor (zod): cada um no seu campo
                if (result.details && typeof result.details === 'object') {
                    const fieldErrors: Record<string, string> = {};
                    for (const [key, detail] of Object.entries(result.details as Record<string, { _errors?: string[] }>)) {
                        const field = SERVER_FIELD_MAP[key];
                        const message = detail?._errors?.[0];
                        if (field && message) fieldErrors[field] = message;
                    }
                    if (Object.keys(fieldErrors).length > 0) {
                        setErrors(fieldErrors);
                        focusFirstInvalid();
                    }
                    throw new Error(GENERIC_SUBMIT_ERROR);
                }

                // Mensagens de regra do servidor (ex.: agendamento pendente) já são
                // frases para o aluno; erros internos ficam com a mensagem genérica.
                throw new Error(response.status < 500 && serverMessage && serverMessage !== 'Erro Interno' ? serverMessage : GENERIC_SUBMIT_ERROR);
            }

            setStep('done');
            scrollToCard();
        } catch (err) {
            setSubmitError(err instanceof Error && err.message ? err.message : GENERIC_SUBMIT_ERROR);
        } finally {
            setSubmitting(false);
        }
    };

    // ---------------------------------------------------------------- estados

    if (loadingEvent) return <BookingSkeleton />;

    if (loadError || !event) {
        const network = loadError === 'network';
        return (
            <div className="w-full max-w-md mx-auto bg-card rounded-xl border border-border p-8 text-center space-y-3 animate-blur-fade">
                <BrandStar className="mx-auto size-10 text-muted-foreground/40 mb-2" />
                <h2 className="text-lg font-semibold text-balance">
                    {network ? 'Não conseguimos carregar a agenda' : 'Este link não está mais disponível'}
                </h2>
                <p className="text-sm text-muted-foreground text-pretty">
                    {network
                        ? 'Confira sua conexão e tente de novo em instantes.'
                        : 'Peça um novo link de agendamento a quem te enviou.'}
                </p>
                {network && (
                    <Button variant="outline" className="h-11 mt-2" onClick={() => setReloadKey(k => k + 1)}>
                        <RotateCcw size={16} className="mr-2" /> Tentar de novo
                    </Button>
                )}
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
    const cancellationPolicy = CANCELLATION_POLICIES[event.id];
    const stepNumber = step === 'when' ? 1 : 2;

    // ------------------------------------------------------------------ layout

    return (
        <div
            ref={cardRef}
            className="w-full max-w-md md:max-w-5xl mx-auto bg-card rounded-xl border border-border overflow-hidden grid md:grid-cols-[260px_1fr] scroll-mt-4 animate-blur-fade"
        >
            {/* Evento e resumo, com um leve tom da marca */}
            <aside className="relative overflow-hidden p-5 sm:p-6 border-b md:border-b-0 md:border-r border-border space-y-4 bg-primary/[0.03]">
                {/* Marca d'água: a estrela, discreta, no canto */}
                <BrandStar className="hidden md:block absolute -bottom-10 -right-10 size-40 text-primary/[0.05] pointer-events-none" />

                <div className="relative">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agendamento</p>
                    <h1 className="text-xl font-bold text-foreground mt-1 break-words text-balance">{event.event_name}</h1>
                </div>
                <ul className="relative space-y-2 text-sm text-muted-foreground">
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

                {/* Passos: compacto no celular, lista no desktop */}
                {step !== 'done' && (
                    <>
                        <p className="md:hidden text-xs font-semibold text-muted-foreground" aria-live="polite">
                            Passo {stepNumber} de 2 · <span className="text-foreground">{stepNumber === 1 ? 'Data e horário' : 'Seus dados'}</span>
                        </p>
                        <ol className="relative hidden md:flex flex-col gap-2 pt-4 border-t border-border text-sm" aria-label="Etapas">
                            {[{ id: 'when', label: 'Data e horário' }, { id: 'details', label: 'Seus dados' }].map((s, i) => {
                                const active = step === s.id;
                                const done = step === 'details' && s.id === 'when';
                                return (
                                    <li key={s.id} className={cn('flex items-center gap-2', active ? 'text-foreground font-semibold' : 'text-muted-foreground')} aria-current={active ? 'step' : undefined}>
                                        <span className={cn(
                                            'size-6 grid place-items-center rounded-full text-xs font-semibold',
                                            COLOR_TRANSITION,
                                            active || done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                        )}>
                                            {done ? '✓' : i + 1}
                                        </span>
                                        {s.label}
                                    </li>
                                );
                            })}
                        </ol>
                    </>
                )}
            </aside>

            <div className="p-5 sm:p-6 min-w-0">
                {submitError && step !== 'done' && (
                    <div className="mb-5 p-3 bg-destructive/10 text-destructive rounded-lg flex items-start gap-2 text-sm animate-in fade-in slide-in-from-top-1" role="alert">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">{submitError}</span>
                    </div>
                )}

                {/* Passo 1: data e horário */}
                {step === 'when' && (
                    <div key="when" className="grid lg:grid-cols-[1fr_220px] gap-6 lg:gap-0 animate-fade-up">
                        <div className="lg:pr-6">
                            <h2 className="text-base font-semibold text-foreground mb-4">Escolha uma data</h2>
                            <MonthCalendar
                                value={date}
                                onChange={selectDate}
                                month={viewMonth || todayBRT.slice(0, 7)}
                                onMonthChange={setViewMonth}
                                minDate={todayBRT}
                                maxDate={maxDate}
                                availableDays={availableDaysSet}
                                loading={loadingMonth}
                            />
                            {!loadingMonth && monthDays && monthDays.length === 0 && !noAvailability && (
                                <p className="mt-3 text-xs text-muted-foreground">Nenhum dia livre neste mês. Veja o próximo.</p>
                            )}
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
                                        onNextDay={nextDay ? () => selectDate(nextDay) : undefined}
                                    />
                                </div>
                            ) : noAvailability ? (
                                <p className="text-sm text-muted-foreground text-pretty">
                                    Não há horários livres nos próximos {BOOKING_WINDOW_DAYS} dias. Fale com quem te enviou este link.
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground text-pretty">Selecione um dia no calendário para ver os horários livres.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Passo 2: dados */}
                {step === 'details' && (
                    <form key="details" onSubmit={handleSubmit} noValidate className="space-y-5 max-w-lg animate-fade-up">
                        <button type="button" onClick={backToWhen} className={cn('inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground', COLOR_TRANSITION)}>
                            <ArrowLeft size={16} /> Voltar
                        </button>

                        {/* Resumo com atalho para trocar */}
                        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
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

                        <div className="space-y-2">
                            <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                {submitting ? 'Confirmando...' : 'Confirmar agendamento'}
                            </Button>
                            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground text-center">
                                <Lock size={12} className="shrink-0" aria-hidden="true" />
                                Usamos seu e-mail e telefone só para este agendamento.
                            </p>
                        </div>
                    </form>
                )}

                {/* Confirmação */}
                {step === 'done' && (
                    <div key="done" className="max-w-lg mx-auto text-center py-4 sm:py-8 space-y-5 animate-blur-fade">
                        <div className="mx-auto size-16 bg-primary/10 rounded-full grid place-items-center">
                            <BrandStar animate className="size-8 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-balance">Agendamento confirmado</h2>
                            <p className="text-muted-foreground mt-2 text-pretty">
                                Obrigado, <strong className="text-foreground">{form.name.trim().split(' ')[0]}</strong>. Enviamos os detalhes para{' '}
                                <strong className="text-foreground break-words">{form.email}</strong>.
                            </p>
                        </div>

                        <div className="rounded-xl border border-border bg-muted/50 p-4 text-left">
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

                        {/* O que acontece agora */}
                        <div className="text-left border-t border-border pt-5">
                            <h3 className="text-sm font-semibold text-foreground mb-3">O que acontece agora</h3>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex gap-3">
                                    <Mail size={16} className="shrink-0 mt-0.5 text-primary" />
                                    <span>Você recebe o convite no seu e-mail, com o link da chamada no Google Meet.</span>
                                </li>
                                <li className="flex gap-3">
                                    <CalendarPlus size={16} className="shrink-0 mt-0.5 text-primary" />
                                    <span>Adicione à sua agenda para não esquecer do horário.</span>
                                </li>
                                <li className="flex gap-3">
                                    <RotateCcw size={16} className="shrink-0 mt-0.5 text-primary" />
                                    <span>Precisa reagendar? Responda a quem te enviou este link.</span>
                                </li>
                            </ul>
                        </div>

                        {cancellationPolicy && (
                            <div className="text-left border border-amber-400 bg-amber-50 rounded-lg p-4 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-amber-800">Política de cancelamento</p>
                                    <p className="text-sm text-amber-700">{cancellationPolicy}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
