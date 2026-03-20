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

    return (
        <button
            onClick={toggleTheme}
            className={cn(
                "w-full flex items-center rounded-lg transition-colors text-sm font-medium relative text-left",
                !collapsed ? "justify-start py-3 pl-12 pr-4" : "justify-center p-3",
                "text-gray-400 hover:bg-white/10 hover:text-white border border-transparent",
                className
            )}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {collapsed ? (theme === 'light' ? <Moon size={20} /> : <Sun size={20} />) : <div className="absolute left-4 top-1/2 -translate-y-1/2">{(theme === 'light' ? <Moon size={20} /> : <Sun size={20} />)}</div>}
            {label && <span className="w-full">{label}</span>}
        </button>
    );
};
