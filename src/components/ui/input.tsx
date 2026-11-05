import React, { useId } from 'react';
import { cn } from "@/lib/utils"
import { CustomSelect } from '../CustomSelect';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  unstyled?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, error, className, unstyled, id, 'aria-describedby': ariaDescribedBy, ...props }) => {
  // Liga o rótulo e o erro ao campo para leitores de tela
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-erro`;

  if (unstyled) {
    return (
      <input
        id={id}
        aria-describedby={ariaDescribedBy}
        className={cn(
          'w-full bg-transparent border-0 p-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0',
          className
        )}
        {...props}
      />
    );
  }

  const describedBy = [ariaDescribedBy, error ? errorId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-muted-foreground">{label}</label>}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          // Mesmo visual dos campos Floating*: h-11, rounded-md, bg-surface, borda border-input e anel de foco ring.
          // text-base no celular: abaixo de 16px o Safari do iPhone dá zoom ao focar; no desktop text-sm
          'w-full h-11 px-3 bg-surface border border-input rounded-md text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring transition-[border-color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive',
          className
        )}
        {...props}
      />
      {error && <p id={errorId} className="text-xs text-destructive">{error}</p>}
    </div>
  );
};



interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: { value: string; label: string }[];
  onChange?: (e: { target: { value: string; name?: string } }) => void;
}

// Reaproveita o CustomSelect (teclado, ARIA e visual iguais aos demais selects)
export const Select: React.FC<SelectProps> = (props) => <CustomSelect {...props} />;
