import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { ChevronDown, Check } from 'lucide-react';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    label?: string;
    options: { value: string; label: string }[];
    onChange?: (e: { target: { value: string; name?: string } }) => void;
}

export const CustomSelect: React.FC<SelectProps> = ({ label, options, className, value, onChange, disabled, name, required }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, minWidth: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                minWidth: rect.width
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            const handleScroll = (e: Event) => {
                const target = e.target as Element;
                if (!target.closest('.dropdown-portal')) {
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
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.dropdown-portal')
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (newValue: string) => {
        if (onChange) {
            onChange({ target: { value: newValue, name } });
        }
        setIsOpen(false);
    };

    return (
        <div className="space-y-1" ref={containerRef}>
            {label && <label className="block text-sm font-bold text-foreground">{label}</label>}
            <div className="relative">
                <input
                    tabIndex={-1}
                    autoComplete="off"
                    style={{ opacity: 0, height: 0, width: 0, position: 'absolute', pointerEvents: 'none' }}
                    value={value || ''}
                    onChange={() => { }}
                    required={required}
                />
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => {
                        if (!disabled) {
                            if (!isOpen) {
                                updatePosition();
                            }
                            setIsOpen(!isOpen);
                        }
                    }}
                    className={cn(
                        'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-left flex items-center justify-between focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200',
                        disabled && 'opacity-50 cursor-not-allowed',
                        className
                    )}
                    disabled={disabled}
                >
                    <span className="block truncate">
                        {selectedOption ? selectedOption.label : 'Selecione...'}
                    </span>
                    <ChevronDown
                        size={16}
                        className={cn(
                            "text-secondary transition-transform duration-200",
                            isOpen && "transform rotate-180"
                        )}
                    />
                </button>

                {isOpen && createPortal(
                    <div
                        className="dropdown-portal fixed z-[9999] bg-surface border border-border rounded-lg shadow-lg overflow-hidden"
                        style={{
                            top: coords.top,
                            left: coords.left,
                            minWidth: coords.minWidth,
                            width: 'max-content'
                        }}
                    >
                        <ul className="max-h-60 overflow-auto py-1">
                            {options.map(opt => (
                                <li
                                    key={opt.value}
                                    onClick={() => handleSelect(opt.value)}
                                    className={cn(
                                        "px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-white/10 transition-colors gap-4",
                                        value === opt.value ? "text-black dark:text-white font-medium bg-white/5" : "text-foreground"
                                    )}
                                >
                                    <span className="block whitespace-nowrap">{opt.label}</span>
                                    {value === opt.value && <Check size={14} className="text-white flex-shrink-0" />}
                                </li>
                            ))}
                        </ul>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
};
