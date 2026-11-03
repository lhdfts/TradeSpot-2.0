import React, { useState, useRef, useId } from 'react';
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
    'aria-describedby': ariaDescribedBy,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    // Liga o rótulo ao campo: leitores de tela anunciam o nome do campo
    const autoId = useId();
    const inputId = props.id ?? autoId;
    const errorId = `${inputId}-erro`;
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
    // A mensagem de erro é lida junto com o campo
    const describedBy = [ariaDescribedBy, error ? errorId : undefined].filter(Boolean).join(' ') || undefined;

    return (
        <div className={cn("relative", className)}>
            <input
                ref={inputRef}
                id={inputId}
                value={value}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder=" "
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className={cn(
                    // text-base no celular: com menos de 16px o Safari do iPhone dá zoom ao focar o campo
                    // Foco igual em todos os campos: anel de 2px na cor ring
                    "w-full h-11 px-3 py-0 border rounded-md shadow-sm transition-[border-color,box-shadow] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring text-base sm:text-sm bg-surface text-foreground",
                    startIcon ? "pl-10" : "",
                    error ? "border-destructive" : "border-input",
                    props.disabled && "opacity-50 cursor-not-allowed"
                )}
                {...props}
            />

            <label
                htmlFor={inputId}
                className={cn(
                    "absolute left-2 bg-surface px-1 transition-[top,font-size,color] duration-200 motion-reduce:transition-none pointer-events-none z-10",
                    startIcon ? "left-9" : "left-2",
                    hasValue || isFocused
                        ? `-top-2 text-xs ${error ? "text-destructive" : isFocused ? "text-foreground" : "text-muted-foreground"}`
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

            {error && <p id={errorId} className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    );
};
