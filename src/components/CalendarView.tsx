import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import type { Appointment } from '../types';

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

    const hasAppointments = (day: number) => {
        if (!isSearching) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        return appointments.some(a => a.date === dateStr);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-black/30 rounded transition-colors"
                >
                    <ChevronLeft size={20} className="text-foreground" />
                </button>
                <h3 className="text-sm font-semibold text-foreground capitalize">{monthName}</h3>
                <button
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-black/30 rounded transition-colors"
                >
                    <ChevronRight size={20} className="text-foreground" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-foreground/70 py-2">
                        {day}
                    </div>
                ))}

                {emptyDays.map(i => (
                    <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {days.map(day => (
                    <button
                        key={day}
                        onClick={() => handleSelectDay(day)}
                        className={`aspect-square rounded text-sm transition-colors flex items-center justify-center ${isSelected(day)
                            ? 'bg-blue-600 text-white shadow-sm font-semibold'
                            : isToday(day)
                                ? 'bg-[#172554] text-white font-semibold'
                                : hasAppointments(day)
                                    ? 'bg-[#172554] text-white font-semibold'
                                    : 'text-foreground hover:bg-accent'
                            }`}
                    >
                        {day}
                    </button>
                ))}
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

    const getAppointmentsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return appointments.filter(appt => appt.date === dateStr);
    };

    const appointmentsForSelectedDate = selectedDate ? getAppointmentsForDate(selectedDate) : [];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Realizado': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'Pendente': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'Cancelado': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'Reagendado': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'Esquecimento': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'Não compareceu': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2 bg-surface rounded-lg border border-border p-6 shadow-sm">

                <SimpleCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} appointments={appointments} isSearching={isSearching} />
            </div>

            {/* Appointments for selected date */}
            <div className="bg-surface rounded-lg border border-border p-6 shadow-sm flex flex-col">
                <h3 className="text-lg font-bold text-foreground mb-4">
                    {selectedDate ? selectedDate.toLocaleDateString('pt-BR') : 'Selecione uma data'}
                </h3>

                <div className="space-y-2 flex-1 overflow-y-auto">
                    {appointmentsForSelectedDate.length > 0 ? (
                        appointmentsForSelectedDate.map(appt => (
                            <div
                                key={appt.id}
                                className="bg-white dark:bg-gray-800 rounded-md p-3 border border-border hover:border-primary/50 transition-colors flex justify-between items-stretch gap-3 shadow-sm"
                            >
                                <div className="flex-1 min-w-0 text-xs text-muted-foreground space-y-1">
                                    <p className="font-bold text-foreground truncate">{appt.lead}</p>
                                    <p className="truncate">{appt.email}</p>
                                    <p>{appt.phone}</p>
                                    <p>{appt.type}</p>
                                    <p>{appt.time}</p>
                                </div>
                                <div className="flex flex-col justify-between items-end flex-shrink-0">
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getStatusColor(appt.status)}`}>
                                        {appt.status}
                                    </span>
                                    <button
                                        onClick={() => onEditAppointment?.(appt)}
                                        className="p-1 text-foreground hover:bg-accent rounded transition-colors"
                                        aria-label="Detalhes do agendamento"
                                    >
                                        <Menu size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex items-center justify-center h-32 text-center">
                            <div>
                                <p className="text-foreground/50">Nenhum agendamento</p>
                                <p className="text-xs text-foreground/30 mt-1">para esta data</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
