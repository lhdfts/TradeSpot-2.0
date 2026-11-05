import React, { useState, useRef, useId } from 'react';
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
    'aria-describedby': ariaDescribedBy,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // Liga o rótulo e o erro ao campo para leitores de tela
    const autoId = useId();
    const textareaId = props.id ?? autoId;
    const errorId = `${textareaId}-erro`;

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        setIsFocused(true);
        onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        setIsFocused(false);
        onBlur?.(e);
    };

    const hasValue = value !== '' && value !== undefined && value !== null;
    const describedBy = [ariaDescribedBy, error ? errorId : undefined].filter(Boolean).join(' ') || undefined;

    return (
        <div className={cn("relative", className)}>
            <textarea
                ref={textareaRef}
                id={textareaId}
                value={value}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder=" "
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className={cn(
                    // text-base no celular: com menos de 16px o Safari do iPhone dá zoom ao focar o campo
                    "w-full px-3 py-2 border rounded-md shadow-sm transition-[border-color,box-shadow] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring text-base sm:text-sm bg-surface text-foreground resize-none",
                    "min-h-[80px]", // Default height
                    error ? "border-destructive" : "border-input",
                    props.disabled && "opacity-50 cursor-not-allowed"
                )}
                {...props}
            />

            <label
                htmlFor={textareaId}
                className={cn(
                    "absolute left-2 bg-surface px-1 transition-[top,font-size,color] duration-200 motion-reduce:transition-none pointer-events-none z-10",
                    hasValue || isFocused
                        ? `-top-2 text-xs ${error ? "text-destructive" : isFocused ? "text-foreground" : "text-muted-foreground"}`
                        : `top-2 text-sm ${error ? "text-destructive" : "text-muted-foreground"}`
                )}
            >
                {label}
            </label>

            {error && <p id={errorId} className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    );
};
