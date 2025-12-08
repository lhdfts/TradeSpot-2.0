"use client";

import { useRef, useEffect, useState } from "react";

/**
 * Componente de input de data com label flutuante e datepicker customizado.
 * Mantém consistência visual com FloatingInput e FloatingSelect.
 *
 * @param {object} props
 * @param {string} props.id - ID do input
 * @param {string} props.label - Label do input
 * @param {string} [props.value] - Valor controlado (YYYY-MM-DD)
 * @param {function} [props.onChange] - Handler de mudança
 * @param {boolean} [props.disabled] - Se o input está desabilitado
 * @param {string} [props.name] - Nome do input para formulários
 * @param {string} [props.className] - Classes adicionais para o container
 * @param {Date} [props.maxDate] - Data máxima permitida (ex: today para desabilitar futuro)
 * @param {object} [props.error] - Objeto de erro com propriedade message
 */
export default function FloatingDateInput({
    id,
    label,
    value = "",
    onChange,
    disabled = false,
    name,
    className = "",
    maxDate,
    error,
}) {
    const [isFocused, setIsFocused] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [displayValue, setDisplayValue] = useState("");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Formata a data para exibição (DD/MM/YYYY)
    const formatDateForDisplay = (dateStr) => {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
    };

    // Converte DD/MM/YYYY para YYYY-MM-DD
    const formatDateForInput = (displayStr) => {
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
    const validateAndConvert = (displayStr) => {
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

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleChange = (e) => {
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
        setIsFocused(false);
        // Se a data é incompleta ao sair do campo, limpa
        if (displayValue && displayValue.length < 10) {
            setDisplayValue("");
            if (onChange) {
                onChange({ target: { id, name, value: "" } });
            }
        }
    };

    const handleFocus = () => {
        setIsFocused(true);
        inputRef.current?.select();
    };

    const openDatePicker = () => {
        setIsOpen(true);
    };

    // Gera os dias do calendário
    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
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
        const totalCells = 42; // 6 semanas
        const remainingDays = totalCells - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({ day: i, isOtherMonth: true });
        }

        return days;
    };

    const handleDateSelect = (day) => {
        const selected = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            day
        );

        // Verifica se a data excede maxDate
        if (maxDate && selected > maxDate) {
            return; // Não permite selecionar data futura
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

    const monthName = currentMonth
        .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
        .replace(/^\w/, (char) => char.toUpperCase())
        .replace(/\sde\s/, (match) => " de ");
    const formattedMonthName = monthName
        .split(" ")
        .map((word, index) => {
            if (word === "de") return "de";
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
    const calendarDays = generateCalendar();
    const weekDays = ["D", "S", "T", "Q1", "Q2", "S1", "S2"];

    const isDateSelected = (day) => {
        if (!value) return false;
        const [year, month, selectedDay] = value.split("-");
        return (
            parseInt(year) === currentMonth.getFullYear() &&
            parseInt(month) === currentMonth.getMonth() + 1 &&
            parseInt(selectedDay) === day
        );
    };

    const isDateDisabled = (day) => {
        const date = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            day
        );
        return maxDate && date > maxDate;
    };

    return (
        <div className={`${className}`}>
            <div className="relative" ref={dropdownRef}>
                {/* Input visual (DD/MM/YYYY) */}
                <input
                    type="text"
                    id={id}
                    ref={inputRef}
                    value={displayValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder=" "
                    disabled={disabled}
                    maxLength={10}
                    className={`
          w-full h-11 px-3 py-0 border rounded-md shadow-sm
          ${error
                            ? "border border-red-500 focus:border-red-500"
                            : isOpen
                                ? "border-2 border-blue-500 focus:border-blue-500"
                                : displayValue
                                    ? "border border-gray-300 focus:border-blue-500"
                                    : "border border-gray-300 focus:border-blue-500"
                        }
          focus:ring-1 ${error ? "focus:ring-red-500" : "focus:ring-blue-500"}
          ${disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white"}
          transition-colors duration-200
          outline-none text-gray-900 text-sm
        `}
                />

                {/* Label flutuante */}
                <label
                    htmlFor={id}
                    className={`
          absolute left-2 bg-white px-1 transition-all duration-200 pointer-events-none z-10
          ${displayValue || isFocused
                            ? `-top-2 text-xs ${error ? "text-red-500" : isFocused ? "text-blue-500" : "text-gray-500"
                            }`
                            : `top-3 text-sm ${error ? "text-red-500" : "text-gray-500"
                            }`
                        }
        `}
                >
                    {label}
                </label>

                {/* Ícone do calendário - clicável (SVG inline) */}
                <button
                    type="button"
                    onClick={openDatePicker}
                    disabled={disabled}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center justify-center w-6 h-6"
                    aria-label="Abrir calendário"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                </button>

                {/* Datepicker customizado */}
                {isOpen && !disabled && (
                    <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80">
                        {/* Header com navegação */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={handlePrevMonth}
                                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                            <span className="text-sm font-medium capitalize text-gray-900">
                                {formattedMonthName}
                            </span>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                        </div>

                        {/* Grid de dias da semana */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {weekDays.map((day) => (
                                <div
                                    key={day}
                                    className="text-center text-xs font-semibold text-gray-500 py-2"
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
                                    className={`
                  h-8 rounded text-sm font-medium transition-colors
                  ${dayObj.isOtherMonth
                                            ? "text-gray-300 cursor-default"
                                            : isDateDisabled(dayObj.day)
                                                ? "text-gray-300 cursor-not-allowed"
                                                : isDateSelected(dayObj.day)
                                                    ? "bg-blue-500 text-white font-bold cursor-pointer hover:bg-blue-600"
                                                    : "text-gray-900 hover:bg-blue-100 cursor-pointer"
                                        }
                `}
                                >
                                    {dayObj.day}
                                </button>
                            ))}
                        </div>

                        {/* Footer com botões */}
                        <div className="flex gap-2 justify-between pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setDisplayValue("");
                                    if (onChange) {
                                        onChange({ target: { id, name, value: "" } });
                                    }
                                    setIsOpen(false);
                                }}
                                className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
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
                                className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                                Hoje
                            </button>
                        </div>
                    </div>
                )}

            </div>

            {/* Mensagem de erro - fora do container relative para não afetar positioning */}
            {error && (
                <p className="mt-1 text-xs text-red-500">{error.message}</p>
            )}
        </div>
    );
}
