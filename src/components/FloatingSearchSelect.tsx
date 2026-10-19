import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { ChevronDown, Check, Search } from 'lucide-react';
import { FloatingInput } from './FloatingInput';
import { sanitizeInput } from '../utils/security';

export interface SearchSelectOption {
    value: string;
    label: string;
}

interface FloatingSearchSelectProps {
    label: string;
    options: SearchSelectOption[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    error?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    // Mostra a opção "Outra" no fim da lista; ao escolhê-la aparece um campo de
    // texto livre e o valor digitado vira o `value`.
    allowOther?: boolean;
    otherLabel?: string;
    otherInputLabel?: string;
    otherMaxLength?: number;
}

const OTHER_KEY = '__other__';

// Busca sem acento e sem diferenciar maiúsculas: "medico" encontra "Médico(a)".
const normalize = (text: string) =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const FloatingSearchSelect: React.FC<FloatingSearchSelectProps> = ({
    label,
    options,
    value,
    onChange,
    disabled,
    loading,
    className,
    error,
    searchPlaceholder = 'Pesquisar...',
    emptyMessage = 'Nenhuma opção encontrada',
    allowOther,
    otherLabel = 'Outra',
    otherInputLabel,
    otherMaxLength = 80
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlighted, setHighlighted] = useState(0);
    const [otherMode, setOtherMode] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const selectedOption = options.find(opt => opt.value === value);
    // Valor que não está na lista (ex.: salvo antes via "Outra"). Só dá para afirmar
    // isso depois que as opções carregaram.
    const isCustomValue = !!allowOther && !!value && !loading && options.length > 0 && !selectedOption;
    const showOther = otherMode || isCustomValue;
    const hasValue = !!selectedOption || showOther;

    const filteredOptions = useMemo(() => {
        const term = normalize(searchTerm);
        if (!term) return options;
        return options.filter(opt => normalize(opt.label).includes(term));
    }, [options, searchTerm]);

    // Itens navegáveis pelo teclado: as opções filtradas e, por último, "Outra".
    const items = useMemo(
        () => (allowOther ? [...filteredOptions, { value: OTHER_KEY, label: otherLabel }] : filteredOptions),
        [filteredOptions, allowOther, otherLabel]
    );

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePosition = () => {
                if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    const spaceBelow = viewportHeight - rect.bottom;
                    const spaceAbove = rect.top;
                    const dropdownHeightApprox = 300;

                    let style: React.CSSProperties = {
                        position: 'fixed',
                        left: `${rect.left}px`,
                        width: `${Math.max(rect.width, 260)}px`,
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
            setTimeout(() => searchInputRef.current?.focus(), 50);

            return () => window.removeEventListener('resize', updatePosition);
        } else {
            setSearchTerm('');
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

    // Ao abrir ou filtrar, destaca a opção atual (se visível) ou a primeira.
    useEffect(() => {
        if (!isOpen) return;
        const current = items.findIndex(item =>
            item.value === OTHER_KEY ? showOther : item.value === value
        );
        setHighlighted(current >= 0 ? current : 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, searchTerm]);

    useEffect(() => {
        itemRefs.current[highlighted]?.scrollIntoView({ block: 'nearest' });
    }, [highlighted]);

    const handleSelect = (item: SearchSelectOption) => {
        if (item.value === OTHER_KEY) {
            // Aproveita o que foi pesquisado como ponto de partida do texto livre.
            const typed = searchTerm.trim();
            setOtherMode(true);
            onChange(showOther ? value : sanitizeInput.text(typed).slice(0, otherMaxLength));
            setIsOpen(false);
            return;
        }
        setOtherMode(false);
        onChange(item.value);
        setIsOpen(false);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted(i => Math.min(i + 1, items.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = items[highlighted];
            if (item) handleSelect(item);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
        }
    };

    const isItemSelected = (item: SearchSelectOption) =>
        item.value === OTHER_KEY ? showOther : !showOther && item.value === value;

    const dropdown = (
        <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-surface border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        >
            <div className="p-2 border-b border-border bg-surface">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder={searchPlaceholder}
                        className="w-full bg-muted/50 border border-border rounded-md pl-8 pr-3 py-1.5 text-base sm:text-sm outline-none focus:ring-1 focus:ring-ring"
                        value={searchTerm}
                        maxLength={50}
                        onChange={(e) => setSearchTerm(sanitizeInput.search(e.target.value))}
                        onKeyDown={handleSearchKeyDown}
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                </div>
            </div>
            <ul role="listbox" className="overflow-auto py-1 max-h-[250px] scrollbar-thin">
                {loading && (
                    <li className="px-3 py-4 text-center text-sm text-muted-foreground">Carregando...</li>
                )}
                {!loading && filteredOptions.length === 0 && (
                    <li className="px-3 py-3 text-center text-sm text-muted-foreground">{emptyMessage}</li>
                )}
                {!loading && items.map((item, index) => {
                    const selected = isItemSelected(item);
                    const isOtherItem = item.value === OTHER_KEY;
                    return (
                        <li
                            key={item.value}
                            ref={el => { itemRefs.current[index] = el; }}
                            role="option"
                            aria-selected={selected}
                            onMouseEnter={() => setHighlighted(index)}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(item);
                            }}
                            className={cn(
                                "px-3 py-2 cursor-pointer flex items-center justify-between transition-colors",
                                index === highlighted && "bg-accent",
                                isOtherItem && filteredOptions.length > 0 && "border-t border-border",
                                selected ? "text-[#070707] dark:text-white font-bold" : "text-foreground"
                            )}
                        >
                            <span className="block">
                                {item.label}
                                {isOtherItem && searchTerm.trim() && filteredOptions.length === 0 && (
                                    <span className="font-normal text-muted-foreground"> — usar "{searchTerm.trim()}"</span>
                                )}
                            </span>
                            {selected && <Check size={14} className="text-[#070707] dark:text-white ml-2 shrink-0" />}
                        </li>
                    );
                })}
            </ul>
        </div>
    );

    return (
        <div className={cn("space-y-4", className)}>
            <div className="relative" ref={containerRef}>
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    className={cn(
                        "w-full h-11 px-3 py-0 border rounded-md shadow-sm transition-colors duration-200 outline-none text-sm bg-surface text-foreground text-left flex items-center justify-between",
                        error
                            ? "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive"
                            : isOpen
                                ? "border-[#070707] dark:border-gray-400 ring-1 ring-[#070707] dark:ring-gray-400"
                                : "border-border focus:border-[#070707] dark:focus:border-gray-400 focus:ring-1 focus:ring-[#070707] dark:focus:ring-gray-400",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={disabled}
                >
                    <span className="block truncate pt-1">
                        {showOther ? otherLabel : selectedOption?.label ?? ''}
                    </span>
                    <ChevronDown
                        size={16}
                        className={cn(
                            "shrink-0 text-muted-foreground transition-transform duration-200",
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

                {error && !showOther && <p className="mt-1 text-xs text-destructive">{error}</p>}
            </div>

            {showOther && (
                <FloatingInput
                    autoFocus={otherMode}
                    label={otherInputLabel ?? `${label} (especifique)`}
                    value={value}
                    maxLength={otherMaxLength}
                    disabled={disabled}
                    error={error}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(sanitizeInput.text(e.target.value))}
                />
            )}
        </div>
    );
};
