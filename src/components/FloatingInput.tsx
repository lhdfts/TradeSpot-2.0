import React, { useState, useRef } from 'react';
import { cn } from '../lib/utils';


interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    startIcon?: React.ReactNode;
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
                    "w-full h-11 px-3 py-0 border rounded-md shadow-sm transition-colors duration-200 outline-none text-sm bg-background text-foreground",
                    startIcon ? "pl-10" : "",
                    error
                        ? "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive"
                        : isFocused
                            ? "border-primary focus:border-primary ring-1 ring-primary"
                            : "border-border focus:border-primary focus:ring-1 focus:ring-primary",
                    props.disabled && "opacity-50 cursor-not-allowed"
                )}
                {...props}
            />

            <label
                className={cn(
                    "absolute left-2 bg-background px-1 transition-all duration-200 pointer-events-none z-10",
                    startIcon ? "left-9" : "left-2",
                    hasValue || isFocused
                        ? `-top-2 text-xs ${error ? "text-destructive" : isFocused ? "text-primary" : "text-muted-foreground"}`
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
