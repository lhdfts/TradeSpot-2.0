import React, { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { ChevronDown, Check } from 'lucide-react';
import { useListbox } from '../hooks/useListbox';

interface FloatingSelectProps {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (e: { target: { value: string; name?: string } }) => void;
    onBlur?: () => void;
    name?: string;
    disabled?: boolean;
    className?: string;
    error?: string;
}

export const FloatingSelect: React.FC<FloatingSelectProps> = ({
    label,
    options,
    value,
    onChange,
    onBlur,
    name,
    disabled,
    className,
    error
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    // Liga rótulo, valor e erro ao gatilho para leitores de tela
    const labelId = useId();
    const valueId = useId();
    const errorId = useId();

    const selectedIndex = options.findIndex(opt => opt.value === value);
    const selectedOption = options[selectedIndex];
    const hasValue = (value !== '' && value !== undefined && value !== null) || !!selectedOption;

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePosition = () => {
                if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    const spaceBelow = viewportHeight - rect.bottom;
                    const spaceAbove = rect.top;
                    const dropdownHeightApprox = 250;

                    let style: React.CSSProperties = {
                        position: 'fixed',
                        left: `${rect.left}px`,
                        minWidth: `${rect.width}px`,
                        zIndex: 9999,
                    };

                    if (spaceBelow < dropdownHeightApprox && spaceAbove > spaceBelow) {
                        style = {
                            ...style,
                            bottom: `${viewportHeight - rect.top + 4}px`,
                            maxHeight: `${spaceAbove - 10}px`,
                            transformOrigin: 'bottom',
                        };
                    } else {
                        style = {
                            ...style,
                            top: `${rect.bottom + 4}px`,
                            maxHeight: `${spaceBelow - 10}px`,
                            transformOrigin: 'top',
                        };
                    }

                    setDropdownStyle(style);
                }
            };

            updatePosition();
            window.addEventListener('resize', updatePosition);
            return () => window.removeEventListener('resize', updatePosition);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        const handleScroll = (event: Event) => {
            if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
                return;
            }
            setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    const handleSelect = (newValue: string) => {
        onChange({ target: { value: newValue, name } });
        setIsOpen(false);
    };

    // Teclado: setas/Home/End movem, Enter/Espaço escolhem, Esc fecha
    const listbox = useListbox({
        isOpen,
        setIsOpen,
        count: options.length,
        selectedIndex,
        onSelect: (index) => handleSelect(options[index].value),
        getLabel: (index) => options[index].label,
        disabled,
    });

    const dropdown = (
        <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-surface border border-border rounded-lg shadow-lg overflow-auto animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none max-h-[250px]"
        >
            <ul id={listbox.listboxId} role="listbox" aria-labelledby={labelId} className="py-1">
                {options.map((opt, index) => {
                    const selected = value === opt.value;
                    return (
                        <li
                            key={opt.value}
                            {...listbox.getOptionProps(index, selected)}
                            className={cn(
                                "px-3 py-2 cursor-pointer flex items-center justify-between transition-colors whitespace-nowrap text-foreground",
                                index === listbox.activeIndex && "bg-accent",
                                selected && "font-bold"
                            )}
                        >
                            <span className="block">{opt.label}</span>
                            {selected && <Check size={14} aria-hidden="true" className="text-primary ml-2" />}
                        </li>
                    );
                })}
            </ul>
        </div>
    );

    const handleBlur = () => {
        // Delay minimal time to allow click event on option to fire first
        setTimeout(() => {
            if (!isOpen) {
                onBlur?.();
            }
            setIsOpen(false);
        }, 150);
    };

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <button
                {...listbox.getTriggerProps()}
                type="button"
                aria-labelledby={`${labelId} ${valueId}`}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                onClick={listbox.handleTriggerClick(() => !disabled && setIsOpen(!isOpen))}
                onBlur={handleBlur}
                className={cn(
                    // Foco igual em todos os campos: anel de 2px na cor ring
                    "w-full h-11 px-3 py-0 border rounded-md shadow-sm transition-[border-color,box-shadow] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring text-sm bg-surface text-foreground text-left flex items-center justify-between",
                    error
                        ? "border-destructive"
                        : isOpen
                            ? "border-ring ring-1 ring-ring"
                            : "border-input",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                disabled={disabled}
            >
                <span id={valueId} className="block truncate pt-1">
                    {selectedOption ? selectedOption.label : ''}
                </span>
                <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={cn(
                        "shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
                        isOpen && "transform rotate-180"
                    )}
                />
            </button>

            <label
                id={labelId}
                className={cn(
                    "absolute left-2 bg-surface px-1 transition-[top,font-size,color] duration-200 motion-reduce:transition-none pointer-events-none z-10",
                    hasValue || isOpen
                        ? `-top-2 text-xs ${error ? "text-destructive" : isOpen ? "text-foreground" : "text-muted-foreground"}`
                        : `top-3 text-sm ${error ? "text-destructive" : "text-muted-foreground"}`
                )}
            >
                {label}
            </label>

            {isOpen && !disabled && createPortal(dropdown, document.body)}

            {error && <p id={errorId} className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    );
};
