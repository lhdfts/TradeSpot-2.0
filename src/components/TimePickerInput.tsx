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
    minTime?: string; // Format HH:MM - Should be the earliest allowed time slot
    hideUnavailable?: boolean;
    pickerGridClass?: string;
    isPreVendasEvent?: boolean; // If true, only show :00 and :30 time slots
}

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
    label,
    value,
    onChange,
    disabled = false,
    readOnly = false,
    availableTimes,
    minTime,
    hideUnavailable = false,
    pickerGridClass,
    isPreVendasEvent = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, above: false, maxHeight: 384 });
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
    // If availableTimes is provided, use it (even if empty). If not (undefined), show all times.
    // For Pré-vendas events, filter to only :00 and :30 slots
    const filteredAllTimes = isPreVendasEvent
        ? allTimes.filter(time => {
            const minutes = time.split(':')[1];
            return minutes === '00' || minutes === '30';
        })
        : allTimes;
    const availableTimesSet = new Set(availableTimes !== undefined ? availableTimes : filteredAllTimes);

    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Sem espaço abaixo (ex.: campo no fim da tela em 1280x720), abre para
            // cima; a altura fica limitada ao espaço visível do lado escolhido.
            const MARGIN = 12;
            const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
            const spaceAbove = rect.top - MARGIN;
            const above = spaceBelow < 260 && spaceAbove > spaceBelow;
            // Mantém a lista (w-96 = 384px) dentro da largura da tela
            const popupWidth = Math.min(384, window.innerWidth * 0.85);
            const left = Math.max(8, Math.min(rect.left, window.innerWidth - popupWidth - 8));
            setCoords({
                top: (above ? rect.top - 4 : rect.bottom + 4) + window.scrollY,
                left: left + window.scrollX,
                width: rect.width,
                above,
                maxHeight: Math.max(160, Math.min(384, above ? spaceAbove : spaceBelow))
            });
        }
    };

    // Close dropdown when clicking outside or scrolling (Desktop only)
    useEffect(() => {
        if (isOpen && !isMobile) {
            updatePosition();
            const handleScroll = (e: Event) => {
                const target = e.target;
                if (target instanceof Element && !target.closest('.timepicker-portal')) {
                    setIsOpen(false);
                }
            };
            const handleResize = () => setIsOpen(false);
            window.addEventListener('scroll', handleScroll, { capture: true });
            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('scroll', handleScroll, { capture: true });
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [isOpen, isMobile]);

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

    const isTimeAvailable = (time: string) => (minTime ? time >= minTime : true) && availableTimesSet.has(time);

    const hasValue = value !== '' && value !== undefined && value !== null;



    const timePickerContent = (
        <div
            className={cn(
                "bg-surface border border-border rounded-lg shadow-lg p-4",
                isMobile
                    ? "w-full mt-2 relative z-0 max-h-60 overflow-y-auto"
                    : "timepicker-portal absolute z-[9999] w-[85vw] sm:w-96 overflow-y-auto"
            )}
            style={!isMobile ? {
                top: coords.top,
                left: coords.left,
                maxHeight: coords.maxHeight,
                transform: coords.above ? 'translateY(-100%)' : undefined
            } : undefined}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={cn("grid gap-2", pickerGridClass || "grid-cols-4")}>
                {filteredAllTimes.map(time => {
                    // For Pré-vendas events, hide :15 and :45 time slots
                    if (isPreVendasEvent) {
                        const minutes = time.split(':')[1];
                        if (minutes === '15' || minutes === '45') {
                            return null;
                        }
                    }

                    const available = isTimeAvailable(time);
                    if (!available && hideUnavailable) return null;

                    return (
                        <button
                            key={time}
                            type="button"
                            onClick={() => handleSelectTime(time)}
                            disabled={!available}
                            className={cn(
                                // py-2.5 no celular: alvo de toque maior
                                'px-2 py-2.5 sm:py-2 text-sm rounded transition-colors font-medium',
                                value === time && available
                                    ? 'bg-[#070707] text-white'
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
        </div>
    );

    return (
        <div className="relative" ref={containerRef}>
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
                    'w-full h-11 px-3 py-0 bg-surface border border-border rounded-md text-foreground text-left flex items-center justify-between outline-none shadow-sm transition-all duration-200',
                    (disabled || readOnly) && 'opacity-50 cursor-not-allowed',
                    isOpen
                        ? "border-[#070707] dark:border-gray-400 focus:border-[#070707] dark:focus:border-gray-400 ring-1 ring-[#070707] dark:ring-gray-400"
                        : "border-border focus:border-[#070707] dark:focus:border-gray-400 focus:ring-1 focus:ring-[#070707] dark:focus:ring-gray-400"
                )}
            >
                <span className="flex items-center gap-2 pt-1 text-sm">
                    <Clock size={16} className="text-muted-foreground" />
                    {value}
                </span>
                <ChevronDown
                    size={16}
                    className={cn(
                        'text-muted-foreground transition-transform duration-200',
                        isOpen && 'transform rotate-180'
                    )}
                />
            </button>

            <label
                className={cn(
                    "absolute left-2 bg-surface px-1 transition-all duration-200 pointer-events-none z-10",
                    hasValue || isOpen
                        ? "-top-2 text-xs text-[#070707] dark:text-gray-400"
                        : "top-3 text-sm text-muted-foreground",
                    isOpen ? "text-[#070707] dark:text-gray-400" : "text-muted-foreground"
                )}
            >
                {label}
            </label>

            {isOpen && !disabled && !readOnly && (
                isMobile ? (
                    // Inline for Mobile
                    <div className="w-full">
                        {timePickerContent}
                    </div>
                ) : (
                    // Portal for Desktop
                    createPortal(timePickerContent, document.body)
                )
            )}
        </div>
    );
};
