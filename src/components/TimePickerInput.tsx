import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface TimePickerInputProps {
    label: string;
    value: string;
    onChange: (time: string) => void;
    disabled?: boolean;
    readOnly?: boolean;
    availableTimes?: string[];
}

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
    label,
    value,
    onChange,
    disabled = false,
    readOnly = false,
    availableTimes: availableTimesParam = [],
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Generate all times (00:00 to 23:45 in 15-minute intervals)
    const generateAllTimes = () => {
        const times: string[] = [];
        for (let hour = 0; hour < 24; hour++) {
            for (let minute of [0, 15, 30, 45]) {
                const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                times.push(timeStr);
            }
        }
        return times;
    };

    const allTimes = generateAllTimes();
    const availableTimesSet = new Set(availableTimesParam.length > 0 ? availableTimesParam : allTimes);

    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    };

    // Close dropdown when clicking outside or scrolling
    useEffect(() => {
        if (isOpen) {
            updatePosition();
            const handleScroll = (e: Event) => {
                const target = e.target as Element;
                if (!target.closest('.timepicker-portal')) {
                    setIsOpen(false);
                }
            };
            window.addEventListener('scroll', handleScroll, { capture: true });
            window.addEventListener('resize', () => setIsOpen(false));
            return () => {
                window.removeEventListener('scroll', handleScroll, { capture: true });
                window.removeEventListener('resize', () => setIsOpen(false));
            };
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.timepicker-portal')
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectTime = (time: string) => {
        if (availableTimesSet.has(time)) {
            onChange(time);
            setIsOpen(false);
        }
    };

    const isTimeAvailable = (time: string) => availableTimesSet.has(time);

    return (
        <div className="space-y-1" ref={containerRef}>
            <label className="block text-sm font-bold text-foreground">{label}</label>
            <div className="relative">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => {
                        if (!disabled && !readOnly) {
                            if (!isOpen) updatePosition();
                            setIsOpen(!isOpen);
                        }
                    }}
                    disabled={disabled || readOnly}
                    className={cn(
                        'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-left flex items-center justify-between focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200',
                        (disabled || readOnly) && 'opacity-50 cursor-not-allowed',
                        isOpen && 'border-primary ring-1 ring-primary'
                    )}
                >
                    <span className="flex items-center gap-2">
                        <Clock size={16} className="text-secondary" />
                        {value || '--:--'}
                    </span>
                    <ChevronDown
                        size={16}
                        className={cn(
                            'text-secondary transition-transform duration-200',
                            isOpen && 'transform rotate-180'
                        )}
                    />
                </button>

                {isOpen && !disabled && !readOnly && createPortal(
                    <div
                        className="timepicker-portal absolute z-[9999] bg-surface border border-border rounded-lg shadow-lg p-4 w-96 max-h-96 overflow-y-auto"
                        style={{
                            top: coords.top,
                            left: coords.left,
                            // We don't force width here to allow it to be wider if needed, but w-96 is fixed width
                        }}
                    >
                        <div className="grid grid-cols-4 gap-2">
                            {allTimes.map(time => {
                                const available = isTimeAvailable(time);
                                return (
                                    <button
                                        key={time}
                                        type="button"
                                        onClick={() => handleSelectTime(time)}
                                        disabled={!available}
                                        className={cn(
                                            'px-2 py-2 text-sm rounded transition-colors font-medium',
                                            value === time && available
                                                ? 'bg-primary text-primary-foreground'
                                                : available
                                                    ? 'bg-blue-500/20 text-blue-600 dark:text-white hover:bg-blue-500/30 cursor-pointer'
                                                    : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                                        )}
                                    >
                                        {time}
                                    </button>
                                );
                            })}
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
};
