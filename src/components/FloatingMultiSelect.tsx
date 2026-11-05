import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useListbox } from '../hooks/useListbox';

interface FloatingMultiSelectProps {
    label: string;
    options: { value: string; label: string }[];
    values: string[];
    onChange: (values: string[]) => void;
    // Texto quando nada está selecionado (nada selecionado = todos).
    emptyLabel?: string;
    className?: string;
}

/** Igual ao FloatingSelect, mas permite marcar várias opções. */
export const FloatingMultiSelect: React.FC<FloatingMultiSelectProps> = ({
    label, options, values, onChange, emptyLabel = 'Todos', className
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const labelId = useId();
    const valueId = useId();

    useEffect(() => {
        if (!isOpen || !containerRef.current) return;
        const updatePosition = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const base: React.CSSProperties = { position: 'fixed', left: `${rect.left}px`, minWidth: `${rect.width}px`, zIndex: 9999 };
            setDropdownStyle(spaceBelow < 250 && spaceAbove > spaceBelow
                ? { ...base, bottom: `${window.innerHeight - rect.top + 4}px`, maxHeight: `${spaceAbove - 10}px` }
                : { ...base, top: `${rect.bottom + 4}px`, maxHeight: `${spaceBelow - 10}px` });
        };
        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!containerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) setIsOpen(false);
        };
        const handleScroll = (event: Event) => {
            if (dropdownRef.current?.contains(event.target as Node)) return;
            setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    const toggle = (value: string) =>
        onChange(values.includes(value) ? values.filter(v => v !== value) : [...values, value]);

    // Índice 0 é a opção "Todos" (limpa a seleção); depois vêm as opções.
    // Enter/Espaço marcam/desmarcam e a lista continua aberta.
    const listbox = useListbox({
        isOpen,
        setIsOpen,
        count: options.length + 1,
        selectedIndex: 0,
        onSelect: (index) => (index === 0 ? onChange([]) : toggle(options[index - 1].value)),
        getLabel: (index) => (index === 0 ? emptyLabel : options[index - 1].label),
    });

    const summary = values.length === 0
        ? emptyLabel
        : values.length === 1
            ? (options.find(o => o.value === values[0])?.label ?? values[0])
            : `${values.length} selecionados`;

    const dropdown = (
        <div ref={dropdownRef} style={dropdownStyle} className="bg-surface border border-border rounded-lg shadow-lg overflow-auto max-h-[300px]">
            <ul id={listbox.listboxId} role="listbox" aria-multiselectable="true" aria-labelledby={labelId} className="py-1">
                <li
                    {...listbox.getOptionProps(0, values.length === 0)}
                    className={cn("px-3 py-2 cursor-pointer flex items-center justify-between whitespace-nowrap",
                        listbox.activeIndex === 0 && "bg-accent",
                        values.length === 0 ? "font-bold text-foreground" : "text-muted-foreground")}
                >
                    <span>{emptyLabel}</span>
                    {values.length === 0 && <Check size={14} aria-hidden="true" className="ml-2" />}
                </li>
                {options.map((opt, i) => {
                    const checked = values.includes(opt.value);
                    const index = i + 1;
                    return (
                        <li
                            key={opt.value}
                            {...listbox.getOptionProps(index, checked)}
                            className={cn("px-3 py-2 cursor-pointer flex items-center gap-2 whitespace-nowrap text-foreground",
                                listbox.activeIndex === index && "bg-accent")}
                        >
                            <span aria-hidden="true" className={cn("h-4 w-4 shrink-0 rounded border flex items-center justify-center",
                                checked ? "bg-primary border-primary" : "border-input")}>
                                {checked && <Check size={12} className="text-primary-foreground" />}
                            </span>
                            <span>{opt.label}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <button
                {...listbox.getTriggerProps()}
                type="button"
                aria-labelledby={`${labelId} ${valueId}`}
                onClick={listbox.handleTriggerClick(() => setIsOpen(!isOpen))}
                className={cn(
                    // Antes era outline-none sem anel: o foco pelo teclado ficava invisível
                    "w-full h-11 px-3 border rounded-md shadow-sm text-sm bg-surface text-foreground text-left flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-ring transition-[border-color,box-shadow]",
                    isOpen ? "border-ring ring-1 ring-ring" : "border-input"
                )}
            >
                <span id={valueId} className="block truncate pt-1">{summary}</span>
                <ChevronDown size={16} aria-hidden="true" className={cn("shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", isOpen && "rotate-180")} />
            </button>
            <label id={labelId} className={cn("absolute left-2 -top-2 bg-surface px-1 text-xs pointer-events-none z-10",
                isOpen ? "text-foreground" : "text-muted-foreground")}>
                {label}
            </label>
            {isOpen && createPortal(dropdown, document.body)}
        </div>
    );
};
