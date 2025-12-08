import React, { useState, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

interface TimePickerModalProps {
    label: string;
    value: string;
    onChange: (time: string) => void;
    disabled?: boolean;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
    label,
    value,
    onChange,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedStartTime, setSelectedStartTime] = useState(value || '09:00');

    // Generate available times (00:00 to 23:45 in 15-minute intervals)
    const generateTimes = () => {
        const times: string[] = [];
        for (let hour = 0; hour < 24; hour++) {
            for (let minute of [0, 15, 30, 45]) {
                const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                times.push(timeStr);
            }
        }
        return times;
    };

    // Calculate end time (start time + 45 minutes)
    const calculateEndTime = (startTime: string) => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + 45;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    };

    const availableTimes = generateTimes();
    const endTime = calculateEndTime(selectedStartTime);

    useEffect(() => {
        setSelectedStartTime(value || '09:00');
    }, [value]);

    const handleConfirm = () => {
        onChange(selectedStartTime);
        setIsOpen(false);
    };

    const handleCancel = () => {
        setSelectedStartTime(value || '09:00');
        setIsOpen(false);
    };

    return (
        <>
            <div className="space-y-1">
                <label className="block text-sm font-bold text-foreground">{label}</label>
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(true)}
                    disabled={disabled}
                    className={cn(
                        'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-left flex items-center justify-between focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                >
                    <span className="flex items-center gap-2">
                        <Clock size={16} className="text-secondary" />
                        {value || '00:00'}
                    </span>
                    <ChevronDown size={16} className="text-secondary" />
                </button>
            </div>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface border border-border rounded-lg shadow-lg p-6 w-96">
                        <h2 className="text-lg font-bold text-foreground mb-6">Selecionar Horário</h2>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {/* Start Time */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-foreground">Início</label>
                                <div className="border border-border rounded-lg bg-background p-3">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock size={16} className="text-primary" />
                                        <span className="text-lg font-bold text-foreground">{selectedStartTime}</span>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                        {availableTimes.map(time => (
                                            <button
                                                key={time}
                                                type="button"
                                                onClick={() => setSelectedStartTime(time)}
                                                className={cn(
                                                    'w-full px-2 py-1 text-sm text-left rounded transition-colors',
                                                    selectedStartTime === time
                                                        ? 'bg-primary text-primary-foreground font-semibold'
                                                        : 'text-foreground hover:bg-white/10'
                                                )}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* End Time */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-foreground">Fim</label>
                                <div className="border border-border rounded-lg bg-background p-3">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock size={16} className="text-primary" />
                                        <span className="text-lg font-bold text-foreground">{endTime}</span>
                                    </div>
                                    <div className="text-xs text-foreground/50 text-center py-12">
                                        Calculado automaticamente
                                        <br />
                                        (Início + 45 min)
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 justify-end">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleCancel}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                onClick={handleConfirm}
                            >
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
