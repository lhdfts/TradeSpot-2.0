import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { ChevronDown, Check } from 'lucide-react';

interface FloatingSelectProps {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (e: { target: { value: string; name?: string } }) => void;
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
    name,
    disabled,
    className,
    error
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);
    // For select, if there's a selected option that isn't empty/default, we consider it having a value
    // Or if the value prop itself is truthy. 
    // Usually 'all' or '' might be considered "empty" for the label to float back down?
    // But for a select, usually there is always a value selected.
    // Let's assume if value is present, label floats.
    const hasValue = value !== '' && value !== undefined && value !== null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (newValue: string) => {
        onChange({ target: { value: newValue, name } });
        setIsOpen(false);
    };

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-11 px-3 py-0 border rounded-md shadow-sm transition-colors duration-200 outline-none text-sm bg-background text-foreground text-left flex items-center justify-between",
                    error
                        ? "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive"
                        : isOpen
                            ? "border-primary focus:border-primary ring-1 ring-primary"
                            : "border-border focus:border-primary focus:ring-1 focus:ring-primary",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                disabled={disabled}
            >
                <span className="block truncate pt-1">
                    {selectedOption ? selectedOption.label : ''}
                </span>
                <ChevronDown
                    size={16}
                    className={cn(
                        "text-muted-foreground transition-transform duration-200",
                        isOpen && "transform rotate-180"
                    )}
                />
            </button>

            <label
                className={cn(
                    "absolute left-2 bg-background px-1 transition-all duration-200 pointer-events-none z-10",
                    hasValue || isOpen
                        ? `-top-2 text-xs ${error ? "text-destructive" : isOpen ? "text-primary" : "text-muted-foreground"}`
                        : `top-3 text-sm ${error ? "text-destructive" : "text-muted-foreground"}`
                )}
            >
                {label}
            </label>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden origin-top animate-in fade-in zoom-in-95 duration-200">
                    <ul className="max-h-60 overflow-auto py-1">
                        {options.map(opt => (
                            <li
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                className={cn(
                                    "px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-accent transition-colors",
                                    value === opt.value ? "text-primary font-medium bg-primary/5" : "text-foreground"
                                )}
                            >
                                <span className="block truncate">{opt.label}</span>
                                {value === opt.value && <Check size={14} className="text-primary" />}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    );
};
