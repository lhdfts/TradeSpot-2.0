import React, { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { ChevronDown, Check } from 'lucide-react';
import { useListbox } from '../hooks/useListbox';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    label?: string;
    options: { value: string; label: string }[];
    onChange?: (e: { target: { value: string; name?: string } }) => void;
}

export const CustomSelect: React.FC<SelectProps> = ({ label, options, className, value, onChange, disabled, name, required }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, minWidth: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    // Liga o rótulo e o valor ao gatilho: leitores de tela anunciam "Rótulo, Valor"
    const labelId = useId();
    const valueId = useId();

    const selectedIndex = options.findIndex(opt => opt.value === value);
    const selectedOption = options[selectedIndex];

    const handleSelect = (newValue: string) => {
        if (onChange) {
            onChange({ target: { value: newValue, name } });
        }
        setIsOpen(false);
    };

    const listbox = useListbox({
        isOpen,
        setIsOpen,
        count: options.length,
        selectedIndex,
        onSelect: (index) => handleSelect(options[index].value),
        getLabel: (index) => options[index].label,
        disabled,
    });
    const buttonRef = listbox.triggerRef;

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
                if (!(target instanceof Element) || !target.closest('.dropdown-portal')) {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    return (
        <div className="space-y-1" ref={containerRef}>
            {label && <label id={labelId} className="block text-sm font-bold text-foreground">{label}</label>}
            <div className="relative">
                <input
                    tabIndex={-1}
                    aria-hidden="true"
                    autoComplete="off"
                    style={{ opacity: 0, height: 0, width: 0, position: 'absolute', pointerEvents: 'none' }}
                    value={value || ''}
                    onChange={() => { }}
                    required={required}
                />
                <button
                    {...listbox.getTriggerProps()}
                    type="button"
                    aria-labelledby={label ? `${labelId} ${valueId}` : valueId}
                    onClick={listbox.handleTriggerClick(() => {
                        if (!disabled) {
                            if (!isOpen) {
                                updatePosition();
                            }
                            setIsOpen(!isOpen);
                        }
                    })}
                    className={cn(
                        // Mesmo visual dos campos (ui/input e Floating*): h-11, rounded-md, borda border-input
                        'w-full h-11 px-3 bg-surface border border-input rounded-md text-base sm:text-sm text-foreground text-left flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-ring transition-[border-color,box-shadow] duration-200',
                        isOpen && 'border-ring',
                        disabled && 'opacity-50 cursor-not-allowed',
                        className
                    )}
                    disabled={disabled}
                >
                    <span id={valueId} className="block truncate">
                        {selectedOption ? selectedOption.label : 'Selecione...'}
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
                        <ul
                            id={listbox.listboxId}
                            role="listbox"
                            aria-labelledby={label ? labelId : undefined}
                            className="max-h-[250px] overflow-auto py-1"
                        >
                            {options.map((opt, index) => {
                                const selected = value === opt.value;
                                return (
                                    <li
                                        key={opt.value}
                                        {...listbox.getOptionProps(index, selected)}
                                        className={cn(
                                            "px-3 py-2 cursor-pointer flex items-center justify-between transition-colors gap-4",
                                            index === listbox.activeIndex && "bg-accent",
                                            selected ? "text-foreground font-semibold" : "text-foreground"
                                        )}
                                    >
                                        <span className="block whitespace-nowrap">{opt.label}</span>
                                        {selected && <Check size={14} aria-hidden="true" className="text-primary flex-shrink-0" />}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
};
