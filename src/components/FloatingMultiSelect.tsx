import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

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

    const summary = values.length === 0
        ? emptyLabel
        : values.length === 1
            ? (options.find(o => o.value === values[0])?.label ?? values[0])
            : `${values.length} selecionados`;

    const dropdown = (
        <div ref={dropdownRef} style={dropdownStyle} className="bg-surface border border-border rounded-lg shadow-lg overflow-auto max-h-[300px]">
            <ul className="py-1">
                <li
                    onMouseDown={(e) => { e.preventDefault(); onChange([]); }}
                    className={cn("px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-accent whitespace-nowrap",
                        values.length === 0 ? "font-bold text-foreground" : "text-muted-foreground")}
                >
                    <span>{emptyLabel}</span>
                    {values.length === 0 && <Check size={14} className="ml-2" />}
                </li>
                {options.map(opt => {
                    const checked = values.includes(opt.value);
                    return (
                        <li
                            key={opt.value}
                            onMouseDown={(e) => { e.preventDefault(); toggle(opt.value); }}
                            className="px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-accent whitespace-nowrap text-foreground"
                        >
                            <span className={cn("h-4 w-4 shrink-0 rounded border flex items-center justify-center",
                                checked ? "bg-[#070707] border-[#070707] dark:bg-white dark:border-white" : "border-border")}>
                                {checked && <Check size={12} className="text-white dark:text-[#070707]" />}
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
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-11 px-3 border rounded-md shadow-sm text-sm bg-surface text-foreground text-left flex items-center justify-between outline-none transition-colors",
                    isOpen ? "border-[#070707] dark:border-gray-400 ring-1 ring-[#070707] dark:ring-gray-400" : "border-border"
                )}
            >
                <span className="block truncate pt-1">{summary}</span>
                <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </button>
            <label className={cn("absolute left-2 -top-2 bg-surface px-1 text-xs pointer-events-none z-10",
                isOpen ? "text-[#070707] dark:text-gray-400" : "text-muted-foreground")}>
                {label}
            </label>
            {isOpen && createPortal(dropdown, document.body)}
        </div>
    );
};
