import React, { useEffect, useId, useRef, useState } from 'react';
import { Columns3, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { OPTIONAL_COLUMNS, type AppointmentColumnId } from './appointmentColumns';

interface ColumnPickerProps {
    visible: AppointmentColumnId[];
    onToggle: (id: AppointmentColumnId) => void;
    onReset: () => void;
    isDefault: boolean;
}

// Botão "Colunas": liga e desliga as colunas opcionais da tabela. Data/Hora,
// Aluno(a) e Status são fixas e não aparecem aqui.
export const ColumnPicker: React.FC<ColumnPickerProps> = ({ visible, onToggle, onReset, isDefault }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const panelId = useId();

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
        };
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [open]);

    return (
        <div className="relative" ref={containerRef}>
            <Button
                variant="outline"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                aria-controls={panelId}
                className={cn('h-11 gap-2 shrink-0', open && 'bg-accent text-accent-foreground')}
                title="Escolher colunas"
            >
                <Columns3 size={16} />
                <span className="hidden 2xl:inline">Colunas</span>
            </Button>

            {open && (
                <div
                    id={panelId}
                    role="group"
                    aria-label="Colunas visíveis"
                    className="absolute right-0 top-full mt-2 z-30 w-64 bg-surface border border-border rounded-lg shadow-lg animate-in fade-in zoom-in-95 duration-150"
                >
                    <div className="px-3 pt-3 pb-2 border-b border-border">
                        <p className="text-sm font-semibold text-foreground">Colunas</p>
                        <p className="text-xs text-secondary">Data/Hora, Aluno(a) e Status são fixas.</p>
                    </div>
                    <ul className="max-h-80 overflow-y-auto py-1">
                        {OPTIONAL_COLUMNS.map(col => {
                            const inputId = `${panelId}-${col.id}`;
                            return (
                                <li key={col.id} className="flex items-center gap-3 px-3 hover:bg-accent transition-colors">
                                    {/* Caixa e rótulo lado a lado (como no EventModal): com o rótulo
                                        envolvendo a caixa, o clique nela alternaria duas vezes. */}
                                    <Checkbox
                                        id={inputId}
                                        checked={visible.includes(col.id)}
                                        onCheckedChange={() => onToggle(col.id)}
                                    />
                                    <label htmlFor={inputId} className="flex-1 py-2 cursor-pointer text-sm text-foreground">
                                        {col.header}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="p-2 border-t border-border">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onReset}
                            disabled={isDefault}
                            className="w-full justify-center gap-2 text-secondary hover:text-foreground"
                        >
                            <RotateCcw size={14} />
                            Restaurar padrão
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
