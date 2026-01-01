import React from 'react';
import { Calendar, Users, PieChart, Ticket, Plus, User, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from './ui/Button';
import { Logo } from './Logo';
import { LogoIcon } from './LogoIcon';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
    onCreateClick?: () => void;
}

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    to: string;
    collapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, to, collapsed }) => (
    <NavLink
        to={to}
        className={({ isActive }) => cn(
            'w-full flex items-center rounded-lg transition-colors text-sm font-medium relative text-left',
            collapsed ? 'justify-center p-3' : 'justify-start py-3 pl-12 pr-4',
            isActive
                ? 'bg-white/10 text-white border border-transparent'
                : 'text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
        )}
        title={collapsed ? label : undefined}
    >
        {collapsed ? icon : <div className="absolute left-4 top-1/2 -translate-y-1/2">{icon}</div>}
        {!collapsed && <span className="w-full">{label}</span>}
    </NavLink>
);

export const Sidebar: React.FC<SidebarProps> = ({ onCreateClick }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [isAgendamentosOpen, setIsAgendamentosOpen] = React.useState(true);
    const { user } = useAuth();
    const { theme } = useTheme();

    return (
        <aside
            className={cn(
                "bg-black border-r border-white/10 flex flex-col transition-all duration-300 ease-in-out relative text-white",
                isCollapsed ? "w-20 p-4" : "w-64 p-6"
            )}
        >
            <div className="mb-8 flex items-center justify-center">
                <NavLink to="/">
                    {isCollapsed ? (
                        <LogoIcon className="h-8 w-auto text-white transition-all duration-300" />
                    ) : (
                        <Logo className="h-8 w-auto text-white transition-all duration-300" />
                    )}
                </NavLink>
            </div>

            <nav className="flex-1 space-y-2">
                {/* Collapsible Agendamentos Group */}
                <div>
                    <button
                        onClick={() => setIsAgendamentosOpen(!isAgendamentosOpen)}
                        className={cn(
                            'w-full flex items-center rounded-lg transition-colors text-sm font-medium relative text-left',
                            isCollapsed ? 'justify-center p-3' : 'justify-start py-3 pl-12 pr-4',
                            'text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
                        )}
                        title={isCollapsed ? "Agendamentos" : undefined}
                    >
                        {isCollapsed ? <Calendar size={20} /> : <div className="absolute left-4 top-1/2 -translate-y-1/2"><Calendar size={20} /></div>}
                        {!isCollapsed && (
                            <>
                                <span className="w-full">Agendamentos</span>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <ChevronDown
                                        size={16}
                                        className={cn(
                                            "transition-transform duration-200 ease-in-out",
                                            isAgendamentosOpen ? "rotate-180" : ""
                                        )}
                                    />
                                </div>
                            </>
                        )}
                    </button>

                    {/* Submenu */}
                    {(!isCollapsed && isAgendamentosOpen) && (
                        <div className="mt-1 space-y-1 relative">
                            {/* Straight vertical line */}
                            <div className="absolute left-[25px] top-0 bottom-2 w-[2px] bg-gray-800" />

                            <NavLink
                                to="/"
                                className={({ isActive }) => cn(
                                    'w-full flex items-center rounded-lg transition-colors text-sm font-medium relative py-2 pl-12 pr-4 justify-start',
                                    isActive
                                        ? 'text-white'
                                        : 'text-gray-400 hover:text-white'
                                )}
                            >
                                <span className="ml-2">Meus agendamentos</span>
                            </NavLink>

                            <NavLink
                                to="/all-appointments"
                                className={({ isActive }) => cn(
                                    'w-full flex items-center rounded-lg transition-colors text-sm font-medium relative py-2 pl-12 pr-4 justify-start',
                                    isActive
                                        ? 'text-white'
                                        : 'text-gray-400 hover:text-white'
                                )}
                            >
                                <span className="ml-2">Todos os Agendamentos</span>
                            </NavLink>
                        </div>
                    )}
                </div>

                <NavLink
                    to="/create-appointment"
                    onClick={onCreateClick}
                    className={({ isActive }) => cn(
                        'w-full flex items-center rounded-lg transition-colors text-sm font-medium relative text-left',
                        isCollapsed ? 'justify-center p-3' : 'justify-start py-3 pl-12 pr-4',
                        isActive
                            ? 'bg-white/10 text-white border border-transparent'
                            : 'text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
                    )}
                    title={isCollapsed ? "Criar agendamento" : undefined}
                >
                    {isCollapsed ? <Plus size={20} /> : <div className="absolute left-4 top-1/2 -translate-y-1/2"><Plus size={20} /></div>}
                    {!isCollapsed && <span className="w-full">Criar agendamento</span>}
                </NavLink>

                {/* Metrics - usually for managers */}
                {(user?.role === 'Admin' || user?.role === 'Líder' || user?.role === 'Co-Líder' || user?.role === 'Dev' || user?.role === 'Qualidade') && (
                    <NavItem
                        icon={<PieChart size={20} />}
                        label={isCollapsed ? "" : "Métricas"}
                        to="/metrics"
                        collapsed={isCollapsed}
                    />
                )}

                {/* Attendants & Events - Admin/Líder only */}
                {/* Attendants - Admin/Líder/Dev only (Co-Lider and Qualidade EXCLUDED) */}
                {(user?.role === 'Admin' || user?.role === 'Líder' || user?.role === 'Dev') && (
                    <NavItem
                        icon={<Users size={20} />}
                        label={isCollapsed ? "" : "Atendentes"}
                        to="/attendants"
                        collapsed={isCollapsed}
                    />
                )}

                {/* Events - Admin/Líder/Dev/Co-Líder/Qualidade */}
                {(user?.role === 'Admin' || user?.role === 'Líder' || user?.role === 'Dev' || user?.role === 'Co-Líder' || user?.role === 'Qualidade') && (
                    <NavItem
                        icon={<Ticket size={20} />}
                        label={isCollapsed ? "" : "Eventos"}
                        to="/events"
                        collapsed={isCollapsed}
                    />
                )}
            </nav>

            <div className="mt-auto mb-2 flex flex-col gap-2">
                <ThemeToggle
                    className="w-full"
                    collapsed={isCollapsed}
                    label={isCollapsed ? null : (theme === 'dark' ? 'Modo Claro' : 'Modo Escuro')}
                />
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={cn(
                        "w-full flex items-center text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors p-2 relative text-left",
                        isCollapsed ? "justify-center" : "!justify-start py-3 pl-12 pr-4"
                    )}
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <div className="absolute left-4 top-1/2 -translate-y-1/2"><ChevronLeft size={20} /></div>}
                    {!isCollapsed && <span className="text-sm font-medium">Ocultar Menu</span>}
                </button>
            </div>

            <div className="pt-4 border-t border-white/10">
                <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center px-0" : "px-2")}>
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                        <User size={16} />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col overflow-hidden transition-opacity duration-300">
                            <span className="text-sm font-medium text-white truncate">{user?.name || 'Usuário'}</span>
                            <span className="text-xs text-gray-400 truncate">{user?.role || 'Guest'}</span>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};
