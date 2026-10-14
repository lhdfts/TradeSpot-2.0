// Horários livres do dia escolhido, agrupados por período. Só aparecem os
// disponíveis: mostrar os ocupados (desabilitados) só fazia o aluno procurar.

import { CalendarX2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

const PERIODS = [
    { label: 'Manhã', from: '00:00', to: '12:00' },
    { label: 'Tarde', from: '12:00', to: '18:00' },
    { label: 'Noite', from: '18:00', to: '24:00' },
];

interface TimeSlotsProps {
    times: string[];
    loading: boolean;
    value: string;
    onSelect: (time: string) => void;
    /** Abre na data seguinte quando o dia não tem horários. */
    onNextDay: () => void;
}

export function TimeSlots({ times, loading, value, onSelect, onNextDay }: TimeSlotsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 gap-2" aria-busy="true" aria-label="Carregando horários">
                {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="h-11 rounded-lg bg-slate-100 animate-shimmer" style={{ animationDelay: `${i * 80}ms` }} />
                ))}
            </div>
        );
    }

    if (times.length === 0) {
        return (
            <div className="flex flex-col items-center text-center py-8 px-4 animate-in fade-in duration-300">
                <div className="size-11 grid place-items-center rounded-xl ring-1 ring-border mb-3">
                    <CalendarX2 size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Nenhum horário livre neste dia</p>
                <p className="text-xs text-muted-foreground mt-1">Escolha outra data no calendário.</p>
                <button type="button" onClick={onNextDay} className="mt-3 text-sm font-semibold text-primary hover:underline">
                    Ver o dia seguinte
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {PERIODS.map(period => {
                const slots = times.filter(t => t >= period.from && t < period.to);
                if (slots.length === 0) return null;
                return (
                    <div key={period.label}>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{period.label}</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                            {slots.map((time, i) => (
                                <button
                                    key={time}
                                    type="button"
                                    onClick={() => onSelect(time)}
                                    aria-pressed={value === time}
                                    style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                                    className={cn(
                                        'h-11 rounded-lg border text-sm font-semibold tabular-nums transition-all duration-150 animate-fade-up',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95',
                                        value === time
                                            ? 'bg-primary border-primary text-primary-foreground'
                                            : 'border-[#000AFF]/30 text-primary hover:border-primary hover:bg-[#000AFF]/5'
                                    )}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
