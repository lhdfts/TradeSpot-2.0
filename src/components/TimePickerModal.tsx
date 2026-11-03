import React, { useState, useEffect, useId } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Modal } from './ui/modal';

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
    const labelId = useId();
    const valueId = useId();
    const startLabelId = useId();

    // Generate available times (00:00 to 23:45 in 15-minute intervals)
    const generateTimes = () => {
        const times: string[] = [];
        for (let hour = 0; hour < 24; hour++) {
            for (const minute of [0, 15, 30, 45]) {
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
                <label id={labelId} className="block text-sm font-bold text-foreground">{label}</label>
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(true)}
                    disabled={disabled}
                    aria-labelledby={`${labelId} ${valueId}`}
                    aria-haspopup="dialog"
                    className={cn(
                        // Mesmo visual dos campos (ui/input e Floating*)
                        'w-full h-11 px-3 bg-surface border border-input rounded-md text-foreground text-left flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-ring transition-[border-color,box-shadow] duration-200',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                >
                    <span id={valueId} className="flex items-center gap-2">
                        <Clock size={16} aria-hidden="true" className="text-muted-foreground" />
                        {value || '00:00'}
                    </span>
                    <ChevronDown size={16} aria-hidden="true" className="text-muted-foreground" />
                </button>
            </div>

            {/* Modal comum: role="dialog", aria-modal, título ligado, Esc fecha (= Cancelar) e foco preso/devolvido */}
            <Modal isOpen={isOpen} onClose={handleCancel} title="Selecionar Horário" maxWidthClass="max-w-sm">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    {/* Start Time */}
                    <div className="space-y-2">
                        <span id={startLabelId} className="block text-sm font-bold text-foreground">Início</span>
                        <div className="border border-border rounded-lg bg-background p-3">
                            <div className="flex items-center gap-2 mb-3">
                                <Clock size={16} aria-hidden="true" className="text-primary" />
                                <span className="text-lg font-bold text-foreground">{selectedStartTime}</span>
                            </div>
                            <div role="group" aria-labelledby={startLabelId} className="max-h-48 overflow-y-auto space-y-1">
                                {availableTimes.map(time => (
                                    <button
                                        key={time}
                                        type="button"
                                        onClick={() => setSelectedStartTime(time)}
                                        aria-pressed={selectedStartTime === time}
                                        className={cn(
                                            'w-full px-2 py-2 sm:py-1 text-sm text-left rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                                            selectedStartTime === time
                                                ? 'bg-primary text-primary-foreground font-semibold'
                                                : 'text-foreground hover:bg-accent'
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
                        <span className="block text-sm font-bold text-foreground">Fim</span>
                        <div className="border border-border rounded-lg bg-background p-3">
                            <div className="flex items-center gap-2 mb-3">
                                <Clock size={16} aria-hidden="true" className="text-primary" />
                                <span className="text-lg font-bold text-foreground">{endTime}</span>
                            </div>
                            <div className="text-xs text-muted-foreground text-center py-12">
                                Calculado automaticamente
                                <br />
                                (Início + 45 min)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCancel}
                        className="w-full sm:w-auto h-11 sm:h-9"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        className="w-full sm:w-auto h-11 sm:h-9"
                    >
                        Confirmar
                    </Button>
                </div>
            </Modal>
        </>
    );
};
