import React, { useState, useRef } from 'react';
import { cn } from '../lib/utils';


interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    startIcon?: React.ReactNode;
    name?: string;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
    label,
    error,
    className,
    value,
    onFocus,
    onBlur,
    startIcon,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        onBlur?.(e);
    };

    const hasValue = value !== '' && value !== undefined && value !== null;

    return (
        <div className={cn("relative", className)}>
            <input
                ref={inputRef}
                value={value}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder=" "
                className={cn(
                    "w-full h-11 px-3 py-0 border rounded-md shadow-sm transition-colors duration-200 outline-none text-sm bg-surface text-foreground",
                    startIcon ? "pl-10" : "",
                    error
                        ? "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive"
                        : isFocused
                            ? "border-[#070707] dark:border-gray-400 focus:border-[#070707] dark:focus:border-gray-400 ring-1 ring-[#070707] dark:ring-gray-400"
                            : "border-border focus:border-[#070707] dark:focus:border-gray-400 focus:ring-1 focus:ring-[#070707] dark:focus:ring-gray-400",
                    props.disabled && "opacity-50 cursor-not-allowed"
                )}
                {...props}
            />

            <label
                className={cn(
                    "absolute left-2 bg-surface px-1 transition-all duration-200 pointer-events-none z-10",
                    startIcon ? "left-9" : "left-2",
                    hasValue || isFocused
                        ? `-top-2 text-xs ${error ? "text-destructive" : isFocused ? "text-[#070707] dark:text-gray-400" : "text-muted-foreground"}`
                        : `top-3 text-sm ${error ? "text-destructive" : "text-muted-foreground"}`
                )}
            >
                {label}
            </label>

            {startIcon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    {startIcon}
                </div>
            )}

            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    );
};
