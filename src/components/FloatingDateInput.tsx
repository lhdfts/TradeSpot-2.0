import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "../lib/utils";

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
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const inputRef = useRef<HTMLInputElement>(null);

    const containerRef = useRef<HTMLDivElement>(null);

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
            setCoords({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX
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
            window.addEventListener('scroll', handleScroll, { capture: true });
            window.addEventListener('resize', () => setIsOpen(false));
            return () => {
                window.removeEventListener('scroll', handleScroll, { capture: true });
                window.removeEventListener('resize', () => setIsOpen(false));
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

    const handleFocus = () => {
        inputRef.current?.select();
    };

    const openDatePicker = () => {
        if (!isOpen) updatePosition();
        setIsOpen(true);
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

    const handleDateSelect = (day: number) => {
        const selected = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
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

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <input
                type="text"
                id={id}
                ref={inputRef}
                value={displayValue}
                onChange={handleChange}
                onFocus={() => {
                    if (!isOpen) openDatePicker();
                    handleFocus();
                }}
                onBlur={handleBlur}
                placeholder=" "
                disabled={disabled}
                maxLength={10}
                className={cn(
                    "w-full h-11 px-3 py-0 border rounded-md shadow-sm transition-colors duration-200 outline-none text-sm bg-surface text-foreground",
                    error
                        ? "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive"
                        : isOpen
                            ? "border-[#070707] dark:border-gray-400 focus:border-[#070707] dark:focus:border-gray-400 ring-1 ring-[#070707] dark:ring-gray-400"
                            : "border-border focus:border-[#070707] dark:focus:border-gray-400 focus:ring-1 focus:ring-[#070707] dark:focus:ring-gray-400",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            />

            <label
                className={cn(
                    "absolute left-2 bg-surface px-1 transition-all duration-200 pointer-events-none z-10",
                    hasValue || isOpen
                        ? "-top-2 text-xs text-[#070707] dark:text-gray-400"
                        : "top-3 text-sm text-muted-foreground",
                    error && "text-destructive",
                    isOpen && !error && "text-[#070707] dark:text-gray-400"
                )}
            >
                {label}
            </label>

            <button
                type="button"
                onClick={openDatePicker}
                disabled={disabled}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center justify-center w-6 h-6"
                aria-label="Abrir calendário"
            >
                <CalendarIcon size={18} />
            </button>

            {/* Datepicker customizado */}
            {isOpen && !disabled && createPortal(
                <div
                    className="datepicker-portal absolute z-[9999] bg-surface border border-border rounded-lg shadow-lg p-4 w-80"
                    style={{
                        top: coords.top,
                        left: coords.left
                    }}
                >
                    {/* Header com navegação */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-1 hover:bg-accent rounded-md transition-colors text-foreground"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-bold capitalize text-foreground">
                            {formattedMonthName}
                        </span>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-1 hover:bg-accent rounded-md transition-colors text-foreground"
                        >
                            <ChevronRight size={16} />
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
                        {calendarDays.map((dayObj, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() =>
                                    !dayObj.isOtherMonth && !isDateDisabled(dayObj.day) && handleDateSelect(dayObj.day)
                                }
                                disabled={dayObj.isOtherMonth || isDateDisabled(dayObj.day)}
                                className={cn(
                                    "h-8 rounded text-sm transition-colors",
                                    dayObj.isOtherMonth
                                        ? "text-muted-foreground font-normal cursor-default"
                                        : isDateDisabled(dayObj.day)
                                            ? "text-muted-foreground/50 cursor-not-allowed font-medium"
                                            : isDateSelected(dayObj.day)
                                                ? "bg-[#070707] text-white font-bold cursor-pointer hover:bg-[#070707]/90"
                                                : "text-foreground font-bold hover:bg-accent cursor-pointer"
                                )}
                            >
                                {dayObj.day}
                            </button>
                        ))}
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
                                setIsOpen(false);
                            }}
                            className="px-3 py-1 text-xs font-bold text-black dark:text-white hover:bg-primary/10 rounded transition-colors"
                        >
                            Limpar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const today = new Date();
                                setCurrentMonth(today);
                                handleDateSelect(today.getDate());
                            }}
                            className="px-3 py-1 text-xs font-bold text-black dark:text-white hover:bg-primary/10 rounded transition-colors"
                        >
                            Hoje
                        </button>
                    </div>
                </div>,
                document.body
            )}



            {/* Mensagem de erro */}
            {
                error && (
                    <p className="mt-1 text-xs text-destructive">{error.message}</p>
                )
            }
        </div >
    );
};
