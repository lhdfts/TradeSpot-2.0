import React, { useState, useRef, useEffect, useId } from 'react';
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
    const gridRef = useRef<HTMLDivElement>(null);
    // Liga o rótulo e o valor ao botão para leitores de tela
    const labelId = useId();
    const valueId = useId();
    const popupId = useId();

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
            for (const minute of [0, 15, 30, 45]) {
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
            // A lista some ao fechar: devolve o foco ao botão
            buttonRef.current?.focus();
        }
    };

    // Ao abrir, o foco vai para o horário escolhido (ou o primeiro disponível)
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            const grid = gridRef.current;
            if (!grid) return;
            const target =
                grid.querySelector<HTMLButtonElement>('button[aria-pressed="true"]:not(:disabled)') ??
                grid.querySelector<HTMLButtonElement>('button:not(:disabled)');
            target?.focus({ preventScroll: true });
            target?.scrollIntoView({ block: 'nearest' });
        }, 0);
        return () => clearTimeout(timer);
    }, [isOpen]);

    // Teclado na grade: setas andam entre horários disponíveis, Esc fecha
    const handleGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
            buttonRef.current?.focus();
            return;
        }
        const grid = gridRef.current;
        if (!grid) return;
        const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
        const steps: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
        const step = steps[e.key];
        if (!step) return;
        const buttons = Array.from(grid.querySelectorAll<HTMLButtonElement>('button'));
        let index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (index < 0) return;
        e.preventDefault();
        // Pula horários indisponíveis na mesma direção
        for (index += step; index >= 0 && index < buttons.length; index += step) {
            if (!buttons[index].disabled) {
                buttons[index].focus();
                return;
            }
        }
    };

    const isTimeAvailable = (time: string) => (minTime ? time >= minTime : true) && availableTimesSet.has(time);

    const hasValue = value !== '' && value !== undefined && value !== null;



    const timePickerContent = (
        <div
            id={popupId}
            role="dialog"
            aria-labelledby={labelId}
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
            <div ref={gridRef} onKeyDown={handleGridKeyDown} className={cn("grid gap-2", pickerGridClass || "grid-cols-4")}>
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
                    const selected = value === time && available;

                    return (
                        <button
                            key={time}
                            type="button"
                            onClick={() => handleSelectTime(time)}
                            disabled={!available}
                            aria-pressed={selected}
                            className={cn(
                                // py-2.5 no celular: alvo de toque maior
                                'px-2 py-2.5 sm:py-2 text-sm rounded transition-colors font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
                                selected
                                    // Token primário: antes #070707 sumia sobre o fundo escuro
                                    ? 'bg-primary text-primary-foreground'
                                    : available
                                        ? 'bg-primary/10 text-primary dark:text-foreground hover:bg-primary/20 cursor-pointer'
                                        : 'bg-muted text-muted-foreground/60 line-through cursor-not-allowed'
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
                onKeyDown={(e) => {
                    if (e.key === 'Escape' && isOpen) {
                        e.stopPropagation();
                        setIsOpen(false);
                    }
                }}
                disabled={disabled || readOnly}
                aria-labelledby={`${labelId} ${valueId}`}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-controls={isOpen ? popupId : undefined}
                className={cn(
                    'w-full h-11 px-3 py-0 bg-surface border rounded-md text-foreground text-left flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm transition-[border-color,box-shadow] duration-200',
                    (disabled || readOnly) && 'opacity-50 cursor-not-allowed',
                    isOpen ? "border-ring ring-1 ring-ring" : "border-input"
                )}
            >
                <span id={valueId} className="flex items-center gap-2 pt-1 text-sm">
                    <Clock size={16} aria-hidden="true" className="text-muted-foreground" />
                    {value}
                </span>
                <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={cn(
                        'shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
                        isOpen && 'transform rotate-180'
                    )}
                />
            </button>

            <label
                id={labelId}
                className={cn(
                    "absolute left-2 bg-surface px-1 transition-[top,font-size,color] duration-200 motion-reduce:transition-none pointer-events-none z-10",
                    hasValue || isOpen ? "-top-2 text-xs" : "top-3 text-sm",
                    isOpen ? "text-foreground" : "text-muted-foreground"
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
