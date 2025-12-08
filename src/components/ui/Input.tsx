
import React, { useState, useRef, useEffect } from 'react';
import { cn } from './Button';
import { ChevronDown, Check } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-secondary">{label}</label>}
      <input
        className={cn(
          'w-full px-3 py-2 bg-background border border-border rounded-lg text-primary placeholder-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors',
          error && 'border-danger focus:border-danger focus:ring-danger',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
};



interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: { value: string; label: string }[];
  onChange?: (e: { target: { value: string; name?: string } }) => void;
}

export const Select: React.FC<SelectProps> = ({ label, options, className, value, onChange, disabled, name }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
      {label && <label className="block text-sm font-medium text-secondary">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            'w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-left flex items-center justify-between focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200',
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

        <div
          className={cn(
            "absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden origin-top",
            isOpen ? "animate-in fade-in zoom-in-95 duration-200" : "hidden"
          )}
        >
          <ul className="max-h-60 overflow-auto py-1">
            {options.map(opt => (
              <li
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-primary/10 transition-colors",
                  value === opt.value ? "text-primary font-medium bg-primary/5" : "text-secondary"
                )}
              >
                <span className="block truncate">{opt.label}</span>
                {value === opt.value && <Check size={14} className="text-primary" />}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
