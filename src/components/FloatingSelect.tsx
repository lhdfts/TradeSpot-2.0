import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const selectedOption = options.find(opt => opt.value === value);
    const hasValue = value !== '' && value !== undefined && value !== null;

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

    const dropdown = (
        <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-surface border border-border rounded-lg shadow-lg overflow-auto animate-in fade-in zoom-in-95 duration-200"
        >
            <ul className="py-1">
                {options.map(opt => (
                    <li
                        key={opt.value}
                        onClick={() => handleSelect(opt.value)}
                        className={cn(
                            "px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-accent transition-colors whitespace-nowrap",
                            value === opt.value ? "text-[#070707] dark:text-white font-bold bg-[#070707]/5 dark:bg-white/10" : "text-foreground"
                        )}
                    >
                        <span className="block">{opt.label}</span>
                        {value === opt.value && <Check size={14} className="text-[#070707] dark:text-white ml-2" />}
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-11 px-3 py-0 border rounded-md shadow-sm transition-colors duration-200 outline-none text-sm bg-surface text-foreground text-left flex items-center justify-between",
                    error
                        ? "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive"
                        : isOpen
                            ? "border-[#070707] dark:border-gray-400 focus:border-[#070707] dark:focus:border-gray-400 ring-1 ring-[#070707] dark:ring-gray-400"
                            : "border-border focus:border-[#070707] dark:focus:border-gray-400 focus:ring-1 focus:ring-[#070707] dark:focus:ring-gray-400",
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
                    "absolute left-2 bg-surface px-1 transition-all duration-200 pointer-events-none z-10",
                    hasValue || isOpen
                        ? `-top-2 text-xs ${error ? "text-destructive" : isOpen ? "text-[#070707] dark:text-gray-400" : "text-muted-foreground"}`
                        : `top-3 text-sm ${error ? "text-destructive" : "text-muted-foreground"}`
                )}
            >
                {label}
            </label>

            {isOpen && !disabled && createPortal(dropdown, document.body)}

            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    );
};
