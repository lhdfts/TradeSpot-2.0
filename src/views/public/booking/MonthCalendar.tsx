// Calendário mensal da página pública de agendamento. Feito à mão (em vez de
// react-day-picker) para a página pública continuar leve.

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

interface MonthCalendarProps {
    /** Dia escolhido, "YYYY-MM-DD" ('' se nenhum). */
    value: string;
    onChange: (iso: string) => void;
    /** Primeiro dia que pode ser escolhido ("YYYY-MM-DD", hoje em Brasília). */
    minDate: string;
}

export function MonthCalendar({ value, onChange, minDate }: MonthCalendarProps) {
    const [minYear, minMonth] = minDate.split('-').map(Number);
    const start = value || minDate;
    const [view, setView] = useState(() => ({ year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) - 1 }));

    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const firstWeekday = new Date(view.year, view.month, 1).getDay();
    const canGoBack = view.year > minYear || (view.year === minYear && view.month > minMonth - 1);

    const shift = (delta: number) =>
        setView(v => {
            const d = new Date(v.year, v.month + delta, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });

    return (
        <div className="w-full select-none">
            <div className="flex items-center justify-between mb-3">
                <button
                    type="button"
                    onClick={() => shift(-1)}
                    disabled={!canGoBack}
                    className="size-9 grid place-items-center rounded-lg text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    aria-label="Mês anterior"
                >
                    <ChevronLeft size={18} />
                </button>
                <p key={`${view.year}-${view.month}`} className="text-sm font-semibold text-foreground capitalize animate-in fade-in duration-300" aria-live="polite">
                    {MONTHS[view.month]} {view.year}
                </p>
                <button
                    type="button"
                    onClick={() => shift(1)}
                    className="size-9 grid place-items-center rounded-lg text-foreground hover:bg-muted transition-colors"
                    aria-label="Próximo mês"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1" role="grid">
                {WEEKDAYS.map(d => (
                    <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground py-1" role="columnheader">
                        {d}
                    </div>
                ))}
                {Array.from({ length: firstWeekday }, (_, i) => <div key={`vazio-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const iso = isoOf(view.year, view.month, day);
                    const disabled = iso < minDate;
                    const selected = iso === value;
                    const today = iso === minDate;
                    return (
                        <button
                            key={iso}
                            type="button"
                            onClick={() => onChange(iso)}
                            disabled={disabled}
                            aria-pressed={selected}
                            aria-label={`${day} de ${MONTHS[view.month]}${today ? ', hoje' : ''}`}
                            className={cn(
                                'relative aspect-square max-h-11 w-full rounded-lg text-sm font-medium tabular-nums transition-all duration-150',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                selected
                                    ? 'bg-primary text-primary-foreground scale-105'
                                    : disabled
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'text-foreground bg-[#000AFF]/5 hover:bg-[#000AFF]/15 active:scale-95'
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
