import React, { useState, useRef } from 'react';
import { cn } from '../lib/utils';

interface FloatingTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    error?: string;
}

export const FloatingTextArea: React.FC<FloatingTextAreaProps> = ({
    label,
    error,
    className,
    value,
    onFocus,
    onBlur,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        setIsFocused(true);
        onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        setIsFocused(false);
        onBlur?.(e);
    };

    const hasValue = value !== '' && value !== undefined && value !== null;

    return (
        <div className={cn("relative", className)}>
            <textarea
                ref={textareaRef}
                value={value}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder=" "
                className={cn(
                    "w-full px-3 py-2 border rounded-md shadow-sm transition-colors duration-200 outline-none text-sm bg-surface text-foreground resize-none",
                    "min-h-[80px]", // Default height
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
                    hasValue || isFocused
                        ? `-top-2 text-xs ${error ? "text-destructive" : isFocused ? "text-[#070707] dark:text-gray-400" : "text-muted-foreground"}`
                        : `top-2 text-sm ${error ? "text-destructive" : "text-muted-foreground"}`
                )}
            >
                {label}
            </label>

            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    );
};
