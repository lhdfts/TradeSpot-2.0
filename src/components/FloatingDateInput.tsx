import React, { useRef, useEffect, useState, useId } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { useMediaQuery } from "../hooks/useMediaQuery";

interface FloatingDateInputProps {
    id?: string;
    label: string;
    value?: string;
    onChange?: (event: { target: { id?: string; name?: string; value: string } }) => void;
    disabled?: boolean;
    name?: string;
    className?: string;
    maxDate?: Date;
    minDate?: Date;
    error?: { message: string };
}

export const FloatingDateInput: React.FC<FloatingDateInputProps> = ({
    id,
    label,
    value = "",
    onChange,
    disabled = false,
    name,
    className = "",
    maxDate,
    minDate,
    error,
}) => {

    const [isOpen, setIsOpen] = useState(false);
    const [displayValue, setDisplayValue] = useState("");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [coords, setCoords] = useState({ top: 0, left: 0, above: false });
    const inputRef = useRef<HTMLInputElement>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    // Liga o rótulo e o erro ao campo (o id pode vir de fora)
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-erro`;

    // Formata a data para exibição (DD/MM/YYYY)
    const formatDateForDisplay = (dateStr: string) => {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
    };

    // Converte DD/MM/YYYY para YYYY-MM-DD
    const formatDateForInput = (displayStr: string) => {
        if (!displayStr) return "";
        const digits = displayStr.replace(/\D/g, "");

        if (digits.length === 0) return "";

        // Limita dia a 31 e mês a 12 durante a digitação
        let day = digits.slice(0, 2);
        let month = digits.slice(2, 4);
        let year = digits.slice(4, 8);

        // Limita dia máximo a 31
        if (day.length === 2) {
            const dayNum = parseInt(day, 10);
            if (dayNum > 31) day = "31";
            if (dayNum === 0) day = "01";
        }

        // Limita mês máximo a 12
        if (month.length === 2) {
            const monthNum = parseInt(month, 10);
            if (monthNum > 12) month = "12";
            if (monthNum === 0) month = "01";
        }

        // Monta a string formatada
        if (digits.length <= 2) return day;
        if (digits.length <= 4) return `${day}/${month}`;
        return `${day}/${month}/${year}`.slice(0, 10);
    };

    // Valida e converte a data de volta para YYYY-MM-DD
    const validateAndConvert = (displayStr: string) => {
        if (!displayStr) return "";

        const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const match = displayStr.match(regex);

        if (!match) return "";

        const [, day, month, year] = match;
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);

        if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return "";

        return `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(
            dayNum
        ).padStart(2, "0")}`;
    };

    useEffect(() => {
        setDisplayValue(formatDateForDisplay(value));
        if (value) {
            const [year, month] = value.split("-");
            setCurrentMonth(new Date(parseInt(year), parseInt(month) - 1));
        }
    }, [value]);

    const updatePosition = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();

            // Calculate available width
            const viewportWidth = window.innerWidth;
            const dropdownWidth = 320; // w-80 is roughly 320px

            // Default left position
            let left = rect.left + window.scrollX;

            // If dropdown would overflow to the right, align it to the right edge of screen minus padding
            if (rect.left + dropdownWidth > viewportWidth) {
                // Try aligning to right of input
                const rightAlignedLeft = (rect.right + window.scrollX) - dropdownWidth;

                // If right-align works (doesn't go off screen left), use it
                // Otherwise force it to be onscreen with some padding
                if (rightAlignedLeft >= 0) {
                    left = rightAlignedLeft;
                } else {
                    // Center or fit within screen
                    left = (viewportWidth - dropdownWidth) / 2;
                    if (left < 10) left = 10; // Minimum margin
                }
            }

            // Sem espaço abaixo (ex.: campo no fim da tela em 1280x720), abre para
            // cima; senão o calendário ficaria fora da tela e rolar a página o fecha.
            const CALENDAR_HEIGHT = 380;
            const spaceBelow = window.innerHeight - rect.bottom;
            const above = spaceBelow < CALENDAR_HEIGHT && rect.top > spaceBelow;

            setCoords({
                top: (above ? rect.top - 4 : rect.bottom + 4) + window.scrollY,
                left: left,
                above
            });
        }
    };

    // Close dropdown when clicking outside or scrolling
    useEffect(() => {
        if (isOpen) {
            updatePosition();
            const handleScroll = (e: Event) => {
                const target = e.target as Element;
                if (!target.closest('.datepicker-portal')) {
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
    }, [isOpen]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.datepicker-portal')
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const formatted = formatDateForInput(raw);
        setDisplayValue(formatted);

        // Apenas atualiza o valor real se a data for válida e completa
        if (formatted.length === 10) {
            const converted = validateAndConvert(formatted);
            if (converted && onChange) {
                onChange({ target: { id, name, value: converted } });
                setIsOpen(false);
            }
        }
    };

    const handleBlur = () => {
        // Se a data é incompleta ao sair do campo, limpa
        if (displayValue && displayValue.length < 10) {
            setDisplayValue("");
            if (onChange) {
                onChange({ target: { id, name, value: "" } });
            }
        }
    };



    const openDatePicker = () => {
        if (!isOpen) updatePosition();
        setIsOpen(true);
    };

    // Pelo botão do calendário, o foco entra no calendário (dia escolhido, hoje ou o
    // primeiro dia disponível) para dar para escolher a data pelo teclado.
    const calendarRef = useRef<HTMLDivElement>(null);
    const calendarButtonRef = useRef<HTMLButtonElement>(null);
    // Ao fechar com o foco dentro do calendário, devolve o foco ao botão (e não ao
    // campo de texto, que reabriria o calendário ao receber foco).
    const restoreFocusFromCalendar = () => {
        if (calendarRef.current?.contains(document.activeElement)) {
            calendarButtonRef.current?.focus();
        }
    };
    const openCalendarWithFocus = () => {
        openDatePicker();
        setTimeout(() => {
            const root = calendarRef.current;
            if (!root) return;
            const target =
                root.querySelector<HTMLButtonElement>('button[aria-pressed="true"]:not(:disabled)') ??
                root.querySelector<HTMLButtonElement>('button[aria-current="date"]:not(:disabled)') ??
                root.querySelector<HTMLButtonElement>('button[aria-pressed]:not(:disabled)');
            target?.focus();
        }, 0);
    };

    // Gera os dias do calendário
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const generateCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);

        const days = [];
        const prevMonthDays = getDaysInMonth(new Date(year, month - 1));

        // Dias do mês anterior
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: prevMonthDays - i, isOtherMonth: true });
        }

        // Dias do mês atual
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, isOtherMonth: false });
        }

        // Dias do próximo mês
        // Dias do próximo mês
        const remainingDays = (7 - (days.length % 7)) % 7;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({ day: i, isOtherMonth: true });
        }

        return days;
    };

    const handleDateSelect = (day: number, base: Date = currentMonth) => {
        const selected = new Date(
            base.getFullYear(),
            base.getMonth(),
            day
        );

        // Verifica se a data excede maxDate
        if (maxDate) {
            const cleanMax = new Date(maxDate);
            cleanMax.setHours(23, 59, 59, 999);
            if (selected > cleanMax) return;
        }

        if (minDate) {
            const cleanMin = new Date(minDate);
            cleanMin.setHours(0, 0, 0, 0);
            if (selected < cleanMin) return;
        }

        const formatted = `${String(selected.getDate()).padStart(2, "0")}/${String(
            selected.getMonth() + 1
        ).padStart(2, "0")}/${selected.getFullYear()}`;
        const converted = validateAndConvert(formatted);

        if (converted && onChange) {
            onChange({ target: { id, name, value: converted } });
            restoreFocusFromCalendar();
            setIsOpen(false);
        }
    };

    const handlePrevMonth = () => {
        setCurrentMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
        );
    };

    const handleNextMonth = () => {
        setCurrentMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
        );
    };

    const formattedMonthName = `${currentMonth.toLocaleDateString('pt-BR', { month: 'long' })} - ${currentMonth.getFullYear()}`
        .split(" ")
        .map((word, _index) => {
            if (word === "-") return "-";
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
    const calendarDays = generateCalendar();
    const weekDays = ["D", "S", "T", "Q1", "Q2", "S1", "S2"];

    const isDateSelected = (day: number) => {
        if (!value) return false;
        const [year, month, selectedDay] = value.split("-");
        return (
            parseInt(year) === currentMonth.getFullYear() &&
            parseInt(month) === currentMonth.getMonth() + 1 &&
            parseInt(selectedDay) === day
        );
    };

    // Nome completo do dia para leitores de tela, ex.: "27 de outubro de 2026"
    const getDayLabel = (day: number) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
            .toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

    const isToday = (day: number) => {
        const today = new Date();
        return today.getFullYear() === currentMonth.getFullYear() &&
            today.getMonth() === currentMonth.getMonth() &&
            today.getDate() === day;
    };

    const isDateDisabled = (day: number) => {
        const date = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            day
        );
        date.setHours(0, 0, 0, 0);

        if (maxDate) {
            const cleanMax = new Date(maxDate);
            cleanMax.setHours(0, 0, 0, 0);
            if (date > cleanMax) return true;
        }
        if (minDate) {
            const cleanMin = new Date(minDate);
            cleanMin.setHours(0, 0, 0, 0);
            if (date < cleanMin) return true;
        }
        return false;
    };

    const hasValue = value && value.length > 0;

    // Abaixo de md usa o seletor de data nativo do aparelho (ver o return do celular)
    const isMobile = useMediaQuery('(max-width: 767px)');

    const calendarContent = (
        <div
            ref={calendarRef}
            className={cn(
                "bg-surface border border-border rounded-lg shadow-lg p-4 absolute z-[9999] w-80 datepicker-portal"
            )}
            style={{
                top: coords.top,
                left: coords.left,
                // Aberto para cima: a borda de baixo encosta no campo
                transform: coords.above ? 'translateY(-100%)' : undefined
            }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            role="dialog"
            aria-label={`Calendário: ${label}`}
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    restoreFocusFromCalendar();
                    setIsOpen(false);
                }
            }}
        >
            {/* Header com navegação */}
            <div className="flex items-center justify-between mb-4">
                <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Mês anterior"
                    className="p-1 hover:bg-accent rounded-md transition-colors text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <span aria-live="polite" className="text-sm font-bold capitalize text-foreground">
                    {formattedMonthName}
                </span>
                <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Próximo mês"
                    className="p-1 hover:bg-accent rounded-md transition-colors text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ChevronRight size={16} aria-hidden="true" />
                </button>
            </div>

            {/* Grid de dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                    <div
                        key={day}
                        className="text-center text-xs font-normal text-foreground py-2"
                    >
                        {day.replace(/\d/g, "")}
                    </div>
                ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-1 mb-4">
                {calendarDays.map((dayObj, index) => {
                    const selected = !dayObj.isOtherMonth && isDateSelected(dayObj.day);
                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={() =>
                                !dayObj.isOtherMonth && !isDateDisabled(dayObj.day) && handleDateSelect(dayObj.day)
                            }
                            disabled={dayObj.isOtherMonth || isDateDisabled(dayObj.day)}
                            // Dias de outro mês são só preenchimento visual
                            aria-hidden={dayObj.isOtherMonth ? true : undefined}
                            aria-label={dayObj.isOtherMonth ? undefined : getDayLabel(dayObj.day)}
                            aria-pressed={dayObj.isOtherMonth ? undefined : selected}
                            aria-current={!dayObj.isOtherMonth && isToday(dayObj.day) ? 'date' : undefined}
                            className={cn(
                                "h-8 rounded text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                dayObj.isOtherMonth
                                    ? "text-muted-foreground font-normal cursor-default"
                                    : isDateDisabled(dayObj.day)
                                        ? "text-muted-foreground/50 cursor-not-allowed font-medium"
                                        : selected
                                            // Token primário: antes #070707 sumia sobre o fundo escuro
                                            ? "bg-primary text-primary-foreground font-bold cursor-pointer hover:bg-primary/90"
                                            : "text-foreground font-bold hover:bg-accent cursor-pointer"
                            )}
                        >
                            {dayObj.day}
                        </button>
                    );
                })}
            </div>

            {/* Footer com botões */}
            <div className="flex gap-2 justify-between pt-4 border-t border-border">
                <button
                    type="button"
                    onClick={() => {
                        setDisplayValue("");
                        if (onChange) {
                            onChange({ target: { id, name, value: "" } });
                        }
                        restoreFocusFromCalendar();
                        setIsOpen(false);
                    }}
                    className="px-3 py-1 text-xs font-bold text-foreground hover:bg-primary/10 rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    Limpar
                </button>
                <button
                    type="button"
                    onClick={() => {
                        const today = new Date();
                        setCurrentMonth(today);
                        // Passa o mês de hoje: o estado currentMonth só muda no próximo render
                        handleDateSelect(today.getDate(), today);
                    }}
                    className="px-3 py-1 text-xs font-bold text-foreground hover:bg-primary/10 rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    Hoje
                </button>
            </div>
        </div>
    );

    // Celular: <input type="date"> abre o calendário nativo do aparelho em vez do
    // customizado, que embutido no campo espremia filtros e formulários.
    if (isMobile) {
        const toISO = (d?: Date) =>
            d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : undefined;
        return (
            <div className={cn("relative", className)}>
                <input
                    type="date"
                    id={inputId}
                    name={name}
                    value={value}
                    min={toISO(minDate)}
                    max={toISO(maxDate)}
                    disabled={disabled}
                    onChange={(e) => onChange?.({ target: { id, name, value: e.target.value } })}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={cn(
                        "w-full h-11 px-3 py-0 border rounded-md shadow-sm transition-[border-color,box-shadow] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring text-base bg-surface text-foreground appearance-none text-left",
                        // iOS centraliza a data e encolhe o campo vazio
                        "[&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.5em]",
                        // Indicador nativo (Android) invisível sobre o campo todo: tocar em qualquer ponto abre o calendário
                        "relative [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0",
                        error ? "border-destructive" : "border-input",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                />
                {/* Rótulo sempre no alto: o campo nativo mostra o próprio formato (dd/mm/aaaa) quando vazio */}
                <label
                    htmlFor={inputId}
                    className={cn(
                        "absolute left-2 -top-2 bg-surface px-1 text-xs pointer-events-none z-10",
                        error ? "text-destructive" : "text-muted-foreground"
                    )}
                >
                    {label}
                </label>
                <CalendarIcon size={18} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                {error && <p id={errorId} className="mt-1 text-xs text-destructive">{error.message}</p>}
            </div>
        );
    }

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <input
                type="text"
                id={inputId}
                ref={inputRef}
                value={displayValue}
                onChange={handleChange}
                onClick={openDatePicker} // Ensure click opens it
                onFocus={openDatePicker}
                onBlur={handleBlur}
                onKeyDown={(e) => {
                    // Esc fecha o calendário sem fechar o modal em volta
                    if (e.key === 'Escape' && isOpen) {
                        e.stopPropagation();
                        setIsOpen(false);
                    } else if (e.key === 'Tab') {
                        setIsOpen(false);
                    }
                }}
                placeholder=" "
                inputMode="numeric"
                disabled={disabled}
                maxLength={10}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={cn(
                    // text-base no celular: com menos de 16px o Safari do iPhone dá zoom ao focar o campo
                    "w-full h-11 px-3 py-0 border rounded-md shadow-sm transition-[border-color,box-shadow] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring text-base sm:text-sm bg-surface text-foreground",
                    error
                        ? "border-destructive"
                        : isOpen
                            ? "border-ring ring-1 ring-ring"
                            : "border-input",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            />

            <label
                htmlFor={inputId}
                className={cn(
                    "absolute left-2 bg-surface px-1 transition-[top,font-size,color] duration-200 motion-reduce:transition-none pointer-events-none z-10",
                    hasValue || isOpen
                        ? "-top-2 text-xs"
                        : "top-3 text-sm",
                    error ? "text-destructive" : isOpen ? "text-foreground" : "text-muted-foreground"
                )}
            >
                {label}
            </label>

            <button
                ref={calendarButtonRef}
                type="button"
                onClick={openCalendarWithFocus}
                disabled={disabled}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center justify-center w-6 h-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Abrir calendário"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <CalendarIcon size={18} aria-hidden="true" />
            </button>

            {/* Datepicker customizado */}
            {isOpen && !disabled && createPortal(calendarContent, document.body)}

            {/* Mensagem de erro */}
            {
                error && (
                    <p id={errorId} className="mt-1 text-xs text-destructive">{error.message}</p>
                )
            }
        </div >
    );
};
