import React, { useState } from 'react';
import { staggerStyle } from '../lib/motion';
import { CalendarX, ChevronLeft, ChevronRight, ChevronRight as Chevron, Clock } from 'lucide-react';
import type { Appointment } from '../types';
import { cn } from '../lib/utils';
import { StatusBadge } from './appointments/StatusBadge';
import { getDisplayStatus } from '../lib/appointmentStatus';
import { useNow } from '../hooks/useNow';

// "YYYY-MM-DD" no fuso local (toISOString usaria UTC e pularia de dia à noite).
const toLocalISO = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

interface CalendarViewProps {
    appointments: Appointment[];
}

const SimpleCalendar: React.FC<{
    selectedDate: Date | undefined;
    onSelectDate: (date: Date) => void;
    appointments: Appointment[];
    isSearching?: boolean;
}> = ({ selectedDate, onSelectDate, appointments, isSearching }) => {
    const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const days = Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

    const monthName = `${currentMonth.toLocaleDateString('pt-BR', { month: 'long' })} - ${currentMonth.getFullYear()}`;

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const handleSelectDay = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        onSelectDate(newDate);
    };

    const isSelected = (day: number) => {
        return selectedDate &&
            selectedDate.getDate() === day &&
            selectedDate.getMonth() === currentMonth.getMonth() &&
            selectedDate.getFullYear() === currentMonth.getFullYear();
    };

    const isToday = (day: number) => {
        const today = new Date();
        return today.getDate() === day &&
            today.getMonth() === currentMonth.getMonth() &&
            today.getFullYear() === currentMonth.getFullYear();
    };

    const countFor = (day: number) => {
        const dateStr = toLocalISO(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
        return appointments.filter(a => a.date === dateStr).length;
    };

    // Destaque forte só durante a busca (como antes); fora dela, um ponto discreto.
    const hasAppointments = (day: number) => isSearching && countFor(day) > 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={handlePrevMonth}
                    className="p-1.5 hover:bg-foreground/10 rounded-md transition-all active:scale-90"
                    aria-label="Mês anterior"
                >
                    <ChevronLeft size={20} className="text-foreground" />
                </button>
                <h3 key={monthName} className="text-sm font-semibold text-foreground capitalize animate-in fade-in duration-300">{monthName}</h3>
                <button
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-foreground/10 rounded-md transition-all active:scale-90"
                    aria-label="Próximo mês"
                >
                    <ChevronRight size={20} className="text-foreground" />
                </button>
            </div>

            <div key={monthName} className="grid grid-cols-7 gap-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-foreground/70 py-2">
                        {day}
                    </div>
                ))}

                {emptyDays.map(i => (
                    <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {days.map(day => {
                    const count = countFor(day);
                    const selected = isSelected(day);
                    return (
                        <button
                            key={day}
                            onClick={() => handleSelectDay(day)}
                            aria-pressed={!!selected}
                            aria-label={`${day}${count ? `, ${count} agendamento${count > 1 ? 's' : ''}` : ''}`}
                            className={cn(
                                'relative aspect-square rounded-md text-sm transition-all duration-150 flex items-center justify-center active:scale-95',
                                selected
                                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                                    : isToday(day)
                                        ? 'bg-[#172554] text-white font-semibold'
                                        : hasAppointments(day)
                                            ? 'bg-[#172554] text-white font-semibold'
                                            : 'text-foreground hover:bg-accent hover:ring-1 hover:ring-border'
                            )}
                        >
                            {day}
                            {count > 0 && (
                                <span
                                    className={cn(
                                        'absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all',
                                        count > 3 ? 'w-3' : 'w-1',
                                        selected || isToday(day) || hasAppointments(day) ? 'bg-white' : 'bg-blue-500'
                                    )}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div >
    );
};

interface CalendarViewProps {
    appointments: Appointment[];
    onEditAppointment?: (appointment: Appointment) => void;
    isSearching?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ appointments, onEditAppointment, isSearching }) => {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const now = useNow();

    const getAppointmentsForDate = (date: Date) => {
        const dateStr = toLocalISO(date);
        return appointments.filter(appt => appt.date === dateStr);
    };

    const appointmentsForSelectedDate = selectedDate ? getAppointmentsForDate(selectedDate) : [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div style={staggerStyle(0, 80)} className="animate-blur-fade lg:col-span-2 bg-surface rounded-lg border border-border p-6 shadow-sm">

                <SimpleCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} appointments={appointments} isSearching={isSearching} />
            </div>

            {/* Appointments for selected date */}
            <div style={staggerStyle(1, 80)} className="animate-blur-fade bg-surface rounded-lg border border-border p-6 shadow-sm flex flex-col">
                <div className="flex items-baseline justify-between gap-2 mb-4">
                    <h3 className="text-lg font-bold text-foreground capitalize">
                        {selectedDate
                            ? selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
                            : 'Selecione uma data'}
                    </h3>
                    {appointmentsForSelectedDate.length > 0 && (
                        <span className="text-xs font-semibold text-secondary tabular-nums">
                            {appointmentsForSelectedDate.length} agendamento{appointmentsForSelectedDate.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto">
                    {appointmentsForSelectedDate.length > 0 ? (
                        [...appointmentsForSelectedDate].sort((x, y) => x.time.localeCompare(y.time)).map((appt, i) => (
                            <button
                                type="button"
                                key={appt.id}
                                onClick={() => onEditAppointment?.(appt)}
                                style={staggerStyle(i, 40)}
                                className="group w-full text-left animate-fade-up bg-background rounded-lg p-3 border border-border hover:border-primary/60 hover:-translate-y-0.5 transition-all flex items-center gap-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                aria-label={`Detalhes de ${appt.lead}`}
                            >
                                <div className="flex flex-col items-center justify-center shrink-0 w-12 text-foreground">
                                    <Clock size={14} className="text-secondary mb-0.5" />
                                    <span className="text-sm font-bold tabular-nums">{appt.time}</span>
                                </div>
                                <div className="flex-1 min-w-0 text-xs text-muted-foreground space-y-0.5 border-l border-border pl-3">
                                    <p className="font-bold text-sm text-foreground truncate">{appt.lead}</p>
                                    <p className="truncate">{appt.type}</p>
                                    <p className="truncate tabular-nums">{appt.phone}</p>
                                </div>
                                <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                                    <StatusBadge status={getDisplayStatus(appt, now)} />
                                    <Chevron size={16} className="text-secondary transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-center animate-in fade-in duration-300">
                            <div className="size-10 grid place-items-center rounded-xl ring-1 ring-border mb-3">
                                <CalendarX size={18} className="text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-foreground/70">Nenhum agendamento</p>
                            <p className="text-xs text-foreground/40 mt-0.5">para esta data</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
