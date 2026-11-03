// Calendário mensal da página pública de agendamento. Feito à mão (em vez de
// react-day-picker) para a página pública continuar leve.
//
// O mês exibido é controlado pela página, que busca os dias com horário livre
// (GET /api/public/available-days) a cada mês. Sem essa lista (falha na busca),
// todos os dias da janela ficam habilitados, como antes.

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

/** "YYYY-MM" somado de `delta` meses. */
const shiftMonth = (month: string, delta: number) => {
    const d = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + delta, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

// Mesma curva do resto do app (--ease-out)
const EASE = '[transition-timing-function:cubic-bezier(0.23,1,0.32,1)]';

interface MonthCalendarProps {
    /** Dia escolhido, "YYYY-MM-DD" ('' se nenhum). */
    value: string;
    onChange: (iso: string) => void;
    /** Mês exibido, "YYYY-MM". */
    month: string;
    onMonthChange: (month: string) => void;
    /** Primeiro dia que pode ser escolhido ("YYYY-MM-DD", hoje em Brasília). */
    minDate: string;
    /** Último dia que pode ser escolhido ("YYYY-MM-DD"). */
    maxDate: string;
    /** Dias com horário livre no mês exibido; null = desconhecido (tudo habilitado). */
    availableDays: Set<string> | null;
    /** Buscando os dias livres do mês. */
    loading?: boolean;
}

export function MonthCalendar({ value, onChange, month, onMonthChange, minDate, maxDate, availableDays, loading = false }: MonthCalendarProps) {
    const year = Number(month.slice(0, 4));
    const monthIndex = Number(month.slice(5, 7)) - 1;

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    const canGoBack = month > minDate.slice(0, 7);
    const canGoForward = month < maxDate.slice(0, 7);

    const navButton = 'size-9 grid place-items-center rounded-lg text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

    return (
        <div className="w-full select-none">
            <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => onMonthChange(shiftMonth(month, -1))} disabled={!canGoBack} className={navButton} aria-label="Mês anterior">
                    <ChevronLeft size={18} />
                </button>
                <p key={month} className="text-sm font-semibold text-foreground capitalize animate-in fade-in duration-300" aria-live="polite">
                    {MONTHS[monthIndex]} {year}
                </p>
                <button type="button" onClick={() => onMonthChange(shiftMonth(month, 1))} disabled={!canGoForward} className={navButton} aria-label="Próximo mês">
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1" aria-hidden="true">
                {WEEKDAYS.map(d => (
                    <div key={d} className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground py-1">
                        {d}
                    </div>
                ))}
            </div>

            <div className={cn('grid grid-cols-7 gap-1', loading && 'motion-safe:animate-pulse')} aria-busy={loading || undefined}>
                {Array.from({ length: firstWeekday }, (_, i) => <div key={`vazio-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const iso = isoOf(year, monthIndex, day);
                    const outOfWindow = iso < minDate || iso > maxDate;
                    const noSlots = !outOfWindow && !loading && availableDays !== null && !availableDays.has(iso);
                    const disabled = outOfWindow || noSlots || loading;
                    const selected = iso === value;
                    const today = iso === minDate;
                    return (
                        <button
                            key={iso}
                            type="button"
                            onClick={() => onChange(iso)}
                            disabled={disabled}
                            aria-pressed={selected}
                            aria-label={`${day} de ${MONTHS[monthIndex]}${today ? ', hoje' : ''}${noSlots ? ', sem horários' : ''}`}
                            className={cn(
                                'relative aspect-square max-h-11 w-full rounded-lg text-sm tabular-nums',
                                `transition-[background-color,border-color,color,transform] duration-200 ${EASE}`,
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                selected
                                    ? 'bg-primary text-primary-foreground font-semibold'
                                    : outOfWindow
                                        ? 'text-muted-foreground/40 cursor-not-allowed'
                                        : noSlots
                                            ? 'text-muted-foreground/60 cursor-not-allowed'
                                            : loading
                                                ? 'text-muted-foreground bg-muted'
                                                : 'text-foreground font-semibold bg-primary/5 hover:bg-primary/15 active:scale-[0.97]'
                            )}
                        >
                            {day}
                            {today && !selected && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
