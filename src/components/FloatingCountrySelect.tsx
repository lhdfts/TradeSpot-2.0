import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { ChevronDown, Check, Search } from 'lucide-react';
import { countryList, type Country } from '../data/countries';

interface FloatingCountrySelectProps {
    label: string;
    value: string; // expects dial_code like "+55"
    onChange: (value: string) => void;
    onBlur?: () => void;
    disabled?: boolean;
    className?: string;
    error?: string;
}

export const FloatingCountrySelect: React.FC<FloatingCountrySelectProps> = ({
    label,
    value,
    onChange,
    disabled,
    className,
    error
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    // Find selected country object based on value (dial_code)
    // If multiple countries share a code (e.g. +1), we optimally want the user to have selected a specific one.
    // However, if we only store the string "+1", we might default to US or CA. 
    // Ideally we should modify the parent to store country code, but user request implies just splitting the field.
    // For now, let's find the first match or match by a heuristic if needed. 
    // Actually, to support the flag in the trigger correctly, we might need a state for the selected country object
    // if the value is just a string. But better yet, let's rely on the user selection.

    // If value is passed from parent, we try to find it in the list.
    const selectedCountry = useMemo(() => {
        return countryList.find(c => c.dial_code === value) || countryList.find(c => c.dial_code === '+55');
    }, [value]);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePosition = () => {
                if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    const spaceBelow = viewportHeight - rect.bottom;
                    const spaceAbove = rect.top;
                    const dropdownHeightApprox = 300; // slightly taller for search

                    let style: React.CSSProperties = {
                        position: 'fixed',
                        left: `${rect.left}px`,
                        minWidth: `${rect.width}px`, // Match width of container
                        width: '300px', // But allow it to be wider if container is small? User screenshot shows it similar width or fixed.
                        // Actually, looking at screenshot, the DDI field is small, but dropdown is wider.
                        // Let's set a min-width reasonable for content.
                        zIndex: 9999,
                    };

                    // If container is really small, we might want a fixed width dropdown
                    if (rect.width < 250) {
                        style.width = '300px';
                    } else {
                        style.width = `${rect.width}px`;
                    }

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
            // Focus search input
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);

            return () => window.removeEventListener('resize', updatePosition);
        } else {
            setSearchTerm(''); // Reset search when closed
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
            // setIsOpen(false); // Don't close on scroll, annoying on mobile? 
            // FloatingSelect closes on scroll. Let's keep it consistent.
            if (!dropdownRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
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

    const filteredCountries = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();
        return countryList.filter(c =>
            c.name.toLowerCase().includes(lowerTerm) ||
            c.dial_code.includes(lowerTerm) ||
            c.code.toLowerCase().includes(lowerTerm)
        );
    }, [searchTerm]);

    const handleSelect = (country: Country) => {
        onChange(country.dial_code);
        setIsOpen(false);
    };



    const dropdown = (
        <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-surface border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        >
            <div className="p-2 border-b border-border sticky top-0 bg-surface z-10">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Buscar país ou código..."
                        className="w-full bg-muted/50 border border-border rounded-md pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()} // Prevent closing
                    />
                </div>
            </div>
            <ul className="overflow-auto py-1 max-h-[250px] scrollbar-thin">
                {filteredCountries.length > 0 ? (
                    filteredCountries.map(country => (
                        <li
                            key={`${country.code}-${country.dial_code}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(country);
                            }}
                            className={cn(
                                "px-3 py-2 cursor-pointer flex items-center gap-3 hover:bg-accent transition-colors",
                                value === country.dial_code ? "bg-accent/50" : ""
                            )}
                        >
                            <img
                                src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                                srcSet={`https://flagcdn.com/w80/${country.code.toLowerCase()}.png 2x`}
                                width="30"
                                height="20"
                                alt={country.name}
                                className="object-cover rounded-sm border border-border/50"
                            />
                            <div className="flex flex-col">
                                <span className={cn("text-sm font-medium", value === country.dial_code ? "text-primary" : "text-foreground")}>
                                    {country.name}
                                </span>
                                <span className="text-xs text-muted-foreground">{country.dial_code}</span>
                            </div>
                            {value === country.dial_code && (
                                <Check size={14} className="ml-auto text-primary" />
                            )}
                        </li>
                    ))
                ) : (
                    <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                        Nenhum país encontrado
                    </li>
                )}
            </ul>
        </div>
    );

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                // onBlur={handleBlur} // Removing blur here to handle search clicking properly
                className={cn(
                    "w-full h-11 px-3 py-0 border rounded-md shadow-sm transition-colors duration-200 outline-none text-sm bg-surface text-foreground text-left flex items-center gap-2",
                    error
                        ? "border-destructive focus:border-destructive"
                        : isOpen
                            ? "border-ring ring-1 ring-ring"
                            : "border-border hover:border-input focus:border-ring",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                disabled={disabled}
            >
                {selectedCountry ? (
                    <div className="flex items-center gap-2 pt-1">
                        <img
                            src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                            srcSet={`https://flagcdn.com/w80/${selectedCountry.code.toLowerCase()}.png 2x`}
                            width="24"
                            height="16"
                            alt={selectedCountry.name}
                            className="object-cover rounded-sm border border-border/50"
                        />
                        <span>{selectedCountry.dial_code}</span>
                    </div>
                ) : (
                    <span className="pt-1 text-muted-foreground">Select...</span>
                )}
                <ChevronDown
                    size={16}
                    className={cn(
                        "ml-auto text-muted-foreground transition-transform duration-200",
                        isOpen && "transform rotate-180"
                    )}
                />
            </button>

            <label
                className={cn(
                    "absolute left-2 bg-surface px-1 transition-all duration-200 pointer-events-none z-10",
                    (value || isOpen)
                        ? `-top-2 text-xs ${error ? "text-destructive" : isOpen ? "text-primary" : "text-muted-foreground"}`
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
