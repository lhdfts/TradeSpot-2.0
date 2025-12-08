import React from 'react';
import { Calendar, Users, PieChart, Ticket, List, Plus, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './ui/Button';
import { Logo } from './Logo';
import { LogoIcon } from './LogoIcon';

interface SidebarProps {
    currentView: string;
    onNavigate: (view: string) => void;
    onCreateClick: () => void;
}

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
    collapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, collapsed }) => (
    <button
        onClick={onClick}
        className={cn(
            'w-full flex items-center gap-3 rounded-lg transition-colors text-sm font-medium',
            collapsed ? 'justify-center p-3' : 'justify-start px-4 py-3 text-left',
            active
                ? 'bg-white/10 text-white border border-transparent'
                : 'text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'

        )}
        title={collapsed ? label : undefined}
    >
        {icon}
        {!collapsed && label}
    </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onCreateClick }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    return (
        <aside
            className={cn(
                "bg-black border-r border-white/10 flex flex-col transition-all duration-300 ease-in-out relative text-white",
                isCollapsed ? "w-20 p-4" : "w-64 p-6"
            )}
        >
            <div className="mb-8 flex items-center justify-center">
                {isCollapsed ? (
                    <LogoIcon className="h-8 w-auto text-white transition-all duration-300" />
                ) : (
                    <Logo className="h-8 w-auto text-white transition-all duration-300" />
                )}
            </div>

            <nav className="flex-1 space-y-2">
                <NavItem
                    icon={<Calendar size={20} />}
                    label={isCollapsed ? "" : "Meus agendamentos"}
                    active={currentView === 'my-appointments'}
                    onClick={() => onNavigate('my-appointments')}
                    collapsed={isCollapsed}
                />
                <NavItem
                    icon={<List size={20} />}
                    label={isCollapsed ? "" : "Todos os Agendamentos"}
                    active={currentView === 'all-appointments'}
                    onClick={() => onNavigate('all-appointments')}
                    collapsed={isCollapsed}
                />
                <button
                    onClick={onCreateClick}
                    className={cn(
                        'w-full flex items-center gap-3 rounded-lg transition-colors text-sm font-medium',
                        isCollapsed ? 'justify-center p-3' : 'justify-start px-4 py-3 text-left',
                        currentView === 'create-appointment'
                            ? 'bg-white/10 text-white border border-transparent'
                            : 'text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
                    )}
                    title={isCollapsed ? "Criar agendamento" : undefined}
                >
                    <Plus size={20} />
                    {!isCollapsed && "Criar agendamento"}
                </button>
                <NavItem
                    icon={<PieChart size={20} />}
                    label={isCollapsed ? "" : "Métricas"}
                    active={currentView === 'metrics'}
                    onClick={() => onNavigate('metrics')}
                    collapsed={isCollapsed}
                />
                <NavItem
                    icon={<Users size={20} />}
                    label={isCollapsed ? "" : "Atendentes"}
                    active={currentView === 'attendants'}
                    onClick={() => onNavigate('attendants')}
                    collapsed={isCollapsed}
                />
                <NavItem
                    icon={<Ticket size={20} />}
                    label={isCollapsed ? "" : "Eventos"}
                    active={currentView === 'events'}
                    onClick={() => onNavigate('events')}
                    collapsed={isCollapsed}
                />
            </nav>

            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={cn(
                    "w-full flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors mt-auto mb-2",
                    isCollapsed ? "px-0" : "px-2"
                )}
            >
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>

            <div className="pt-4 border-t border-white/10">
                <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center px-0" : "px-2")}>
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                        <User size={16} />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col overflow-hidden transition-opacity duration-300">
                            <span className="text-sm font-medium text-white truncate">Usuário</span>
                            <span className="text-xs text-gray-400 truncate">Admin</span>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};
