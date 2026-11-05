import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';


import { cn } from './ui/button';

interface ThemeToggleProps {
    className?: string;
    label?: string | null;
    collapsed?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, label, collapsed }) => {
    const { theme, toggleTheme } = useTheme();
    const acao = theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro';
    const icone = theme === 'light' ? <Moon size={20} aria-hidden /> : <Sun size={20} aria-hidden />;

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={cn(
                "w-full flex items-center rounded-lg transition-colors text-sm font-medium relative text-left",
                !collapsed ? "justify-start py-3 pl-12 pr-4" : "justify-center p-3",
                "text-gray-400 hover:bg-white/10 hover:text-white border border-transparent",
                className
            )}
            // Nome acessível em pt-BR: recolhido, o botão é só o ícone.
            aria-label={acao}
            title={acao}
        >
            {collapsed ? icone : <div className="absolute left-4 top-1/2 -translate-y-1/2">{icone}</div>}
            {label && <span className="w-full">{label}</span>}
        </button>
    );
};
