import React from 'react';
import { Calendar, Users, PieChart, Ticket, Plus, User, ChevronLeft, ChevronRight, ChevronDown, LogOut, Webhook, History, Settings as SettingsIcon, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from './ui/button';
import { Logo } from './Logo';
import { LogoIcon } from './LogoIcon';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface SidebarProps {
    onCreateClick?: () => void;
    /** Abaixo de lg o menu é uma gaveta: aberta/fechada pelo cabeçalho da página. */
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    to: string;
    collapsed?: boolean;
}

// Barra do item ativo: cresce do centro quando a rota casa.
const ActiveBar: React.FC<{ active: boolean }> = ({ active }) => (
    <span
        aria-hidden
        className={cn(
            'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-blue-500 origin-center transition-transform duration-300 ease-out',
            active ? 'scale-y-100' : 'scale-y-0'
        )}
    />
);

const navItemClasses = (isActive: boolean, collapsed?: boolean) => cn(
    'group w-full flex items-center rounded-lg transition-all duration-200 text-sm font-medium relative text-left active:scale-[0.98]',
    collapsed ? 'justify-center p-3' : 'justify-start py-3 pl-12 pr-4',
    isActive
        ? 'bg-white/10 text-white border border-transparent'
        : 'text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
);

const iconMotion = 'transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-rotate-3';

const NavItem: React.FC<NavItemProps> = ({ icon, label, to, collapsed }) => (
    <NavLink
        to={to}
        className={({ isActive }) => navItemClasses(isActive, collapsed)}
        title={collapsed ? label : undefined}
    >
        {({ isActive }) => (
            <>
                <ActiveBar active={isActive} />
                {collapsed
                    ? <span className={iconMotion}>{icon}</span>
                    : <div className={cn('absolute left-4 top-1/2 -translate-y-1/2', iconMotion)}>{icon}</div>}
                {!collapsed && <span className="w-full transition-transform duration-200 group-hover:translate-x-0.5">{label}</span>}
            </>
        )}
    </NavLink>
);

export const Sidebar: React.FC<SidebarProps> = ({ onCreateClick, mobileOpen = false, onMobileClose }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    const [isAgendamentosOpen, setIsAgendamentosOpen] = React.useState(true);
    const { user, logout } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();

    // lg (1024px) para cima: menu lateral fixo. Abaixo: gaveta sobre a página.
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    // Na gaveta o menu está sempre expandido (recolher só existe no desktop).
    const effectiveCollapsed = isDesktop && isCollapsed && !isHovered;

    // Gaveta: Esc fecha.
    React.useEffect(() => {
        if (isDesktop || !mobileOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onMobileClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isDesktop, mobileOpen, onMobileClose]);

    // Gaveta: escolher um destino fecha o menu.
    const closeOnNavigate = (e: React.MouseEvent) => {
        if (!isDesktop && (e.target as Element).closest('a')) onMobileClose?.();
    };

    const content = (
        <>
            <div className="mb-6 lg:mb-8 flex items-center justify-center shrink-0">
                <NavLink to="/">
                    {effectiveCollapsed ? (
                        <LogoIcon className="h-8 w-auto text-white transition-all duration-300" />
                    ) : (
                        <Logo className="h-8 w-auto text-white transition-all duration-300" />
                    )}
                </NavLink>
            </div>

            {/* min-h-0 + overflow: em telas baixas (ex.: 1280x720) a lista rola e o
                rodapé com tema, perfil e Sair continua visível */}
            <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-1 px-1 space-y-2 stagger-children">
                {/* Collapsible Agendamentos Group */}
                <div>
                    <button
                        onClick={() => setIsAgendamentosOpen(!isAgendamentosOpen)}
                        className={cn(
                            'group w-full flex items-center rounded-lg transition-all duration-200 text-sm font-medium relative text-left active:scale-[0.98]',
                            effectiveCollapsed ? 'justify-center p-3' : 'justify-start py-3 pl-12 pr-4',
                            'text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
                        )}
                        title={effectiveCollapsed ? "Agendamentos" : undefined}
                    >
                        {effectiveCollapsed
                            ? <span className={iconMotion}><Calendar size={20} /></span>
                            : <div className={cn('absolute left-4 top-1/2 -translate-y-1/2', iconMotion)}><Calendar size={20} /></div>}
                        {!effectiveCollapsed && (
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
                    {/* Sempre montado: a altura anima via grid-rows (0fr -> 1fr) */}
                    {!effectiveCollapsed && (
                        <div
                            className={cn(
                                'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
                                isAgendamentosOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                            )}
                            aria-hidden={!isAgendamentosOpen}
                        >
                            <div className="overflow-hidden">
                                <div className="mt-1 space-y-1 relative">
                                    {/* Straight vertical line */}
                                    <div className="absolute left-[25px] top-0 bottom-2 w-[2px] bg-gray-800" />

                                    <NavLink
                                        to="/"
                                        tabIndex={isAgendamentosOpen ? 0 : -1}
                                        className={({ isActive }) => cn(
                                            'w-full flex items-center rounded-lg transition-all duration-200 text-sm font-medium relative py-2 pl-12 pr-4 justify-start hover:translate-x-1',
                                            isActive
                                                ? 'text-white'
                                                : 'text-gray-400 hover:text-white'
                                        )}
                                    >
                                        <span className="ml-2">Meus agendamentos</span>
                                    </NavLink>

                                    {!(user?.role === 'Colaborador' && user?.sector === 'Closer') && (
                                        <NavLink
                                            to="/all-appointments"
                                            tabIndex={isAgendamentosOpen ? 0 : -1}
                                            className={({ isActive }) => cn(
                                                'w-full flex items-center rounded-lg transition-all duration-200 text-sm font-medium relative py-2 pl-12 pr-4 justify-start hover:translate-x-1',
                                                isActive
                                                    ? 'text-white'
                                                    : 'text-gray-400 hover:text-white'
                                            )}
                                        >
                                            <span className="ml-2">Todos os Agendamentos</span>
                                        </NavLink>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <NavLink
                    to="/create-appointment"
                    onClick={onCreateClick}
                    className={({ isActive }) => navItemClasses(isActive, effectiveCollapsed)}
                    title={effectiveCollapsed ? "Criar agendamento" : undefined}
                >
                    {({ isActive }) => (
                        <>
                            <ActiveBar active={isActive} />
                            {/* O "+" gira ao passar o mouse */}
                            {effectiveCollapsed
                                ? <span className="transition-transform duration-300 group-hover:rotate-90"><Plus size={20} /></span>
                                : <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-transform duration-300 group-hover:rotate-90"><Plus size={20} /></div>}
                            {!effectiveCollapsed && <span className="w-full">Criar agendamento</span>}
                        </>
                    )}
                </NavLink>

                {/* Metrics - gestão vê rankings; Colaborador vê só os próprios números */}
                {(user?.role === 'Admin' || user?.role === 'Líder' || user?.role === 'Co-líder' || user?.role === 'Dev' || user?.role === 'Qualidade' || user?.role === 'Colaborador') && (
                    <NavItem
                        icon={<PieChart size={20} />}
                        label={effectiveCollapsed ? "" : "Métricas"}
                        to="/metrics"
                        collapsed={effectiveCollapsed}
                    />
                )}

                {/* Atendentes & Events - Admin/Líder only */}
                {/* Atendentes - Admin/Líder/Dev only (Co-lider and Qualidade EXCLUDED) */}
                {(user?.role === 'Admin' || user?.role === 'Líder' || user?.role === 'Dev' || user?.role === 'Co-líder' || user?.role === 'Qualidade') && (
                    <NavItem
                        icon={<Users size={20} />}
                        label={effectiveCollapsed ? "" : "Atendentes"}
                        to="/attendants"
                        collapsed={effectiveCollapsed}
                    />
                )}

                {/* Events - Admin/Líder/Dev/Co-líder/Qualidade/Colaborador */}
                {(user?.role === 'Admin' || user?.role === 'Líder' || user?.role === 'Dev' || user?.role === 'Co-líder' || user?.role === 'Qualidade' || user?.role === 'Colaborador') && (
                    <NavItem
                        icon={<Ticket size={20} />}
                        label={effectiveCollapsed ? "" : "Eventos"}
                        to="/events"
                        collapsed={effectiveCollapsed}
                    />
                )}

                {/* Conexões Unnichat - Admin/Líder/Dev/TEI */}
                {(user?.role === 'Admin' || user?.role === 'Líder' || user?.role === 'Dev' || user?.sector === 'TEI') && (
                    <NavItem
                        icon={<Webhook size={20} />}
                        label={effectiveCollapsed ? "" : "Conexões Unnichat"}
                        to="/unnichat-connections"
                        collapsed={effectiveCollapsed}
                    />
                )}

                {/* Logs de Execução / Distribuição - Admin, Dev, Líder */}
                {(user?.role === 'Admin' || user?.role === 'Dev' || user?.role === 'Líder') && (
                    <NavItem
                        icon={<History size={20} />}
                        label={effectiveCollapsed ? "" : "Logs"}
                        to="/logs"
                        collapsed={effectiveCollapsed}
                    />
                )}

                {/* Configurações do sistema - Admin, Dev */}
                {(user?.role === 'Admin' || user?.role === 'Dev') && (
                    <NavItem
                        icon={<SettingsIcon size={20} />}
                        label={effectiveCollapsed ? "" : "Configurações"}
                        to="/settings"
                        collapsed={effectiveCollapsed}
                    />
                )}

                {/* CEO Scheduler - Admin only */}
                {(user?.role === 'Admin') && (
                    <NavItem
                        icon={<Calendar size={20} />}
                        label={effectiveCollapsed ? "" : "Agenda CEO"}
                        to="/ceo-scheduler"
                        collapsed={effectiveCollapsed}
                    />
                )}
            </nav>

            <div className="mt-auto pt-2 mb-2 flex flex-col gap-2 shrink-0">
                <ThemeToggle
                    className="w-full"
                    collapsed={effectiveCollapsed}
                    label={effectiveCollapsed ? null : (theme === 'dark' ? 'Modo Claro' : 'Modo Escuro')}
                />
                {isDesktop && (
                    <button
                        onClick={() => {
                            setIsCollapsed(!isCollapsed);
                            setIsHovered(false);
                        }}
                        className={cn(
                            "w-full flex items-center text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors p-2 relative text-left",
                            effectiveCollapsed ? "justify-center" : "!justify-start py-3 pl-12 pr-4"
                        )}
                    >
                        {effectiveCollapsed ? <ChevronRight size={20} /> : <div className="absolute left-4 top-1/2 -translate-y-1/2"><ChevronLeft size={20} /></div>}
                        {!effectiveCollapsed && <span className="text-sm font-medium">{isCollapsed ? "Fixar Menu" : "Ocultar Menu"}</span>}
                    </button>
                )}
            </div>

            <div className="pt-4 border-t border-white/10 shrink-0">
                <div className={cn("flex items-center gap-3", effectiveCollapsed ? "justify-center px-0" : "px-2")}>
                    <NavLink
                        to="/profile"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate('/profile');
                        }}
                        className="flex items-center gap-3 flex-1 overflow-hidden group hover:opacity-80 transition-opacity rounded-lg p-1 text-left cursor-pointer"
                        title="Abrir Perfil"
                    >
                        <div
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate('/profile');
                            }}
                            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0 group-hover:scale-105 transition-transform cursor-pointer"
                            title="Abrir Perfil"
                        >
                            <User size={16} />
                        </div>
                        {!effectiveCollapsed && (
                            <div className="flex flex-col overflow-hidden transition-opacity duration-300 flex-1">
                                <span className="text-sm font-medium text-white truncate">{user?.name || 'Usuário'}</span>
                                <span className="text-xs text-gray-400 truncate">{user?.role || 'Guest'}</span>
                            </div>
                        )}
                    </NavLink>
                    {!effectiveCollapsed && (
                        <button
                            onClick={logout}
                            className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10 shrink-0"
                            title="Sair"
                        >
                            <LogOut size={16} />
                        </button>
                    )}
                </div>
            </div>
        </>
    );

    if (!isDesktop) {
        return (
            <div
                className={cn('fixed inset-0 z-50', !mobileOpen && 'pointer-events-none')}
                inert={!mobileOpen}
                aria-hidden={!mobileOpen}
            >
                <div
                    className={cn('absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300', mobileOpen ? 'opacity-100' : 'opacity-0')}
                    onClick={onMobileClose}
                />
                <aside
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu"
                    onClick={closeOnNavigate}
                    className={cn(
                        'absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-black border-r border-white/10 flex flex-col p-6 text-white',
                        'transition-transform duration-300 ease-in-out',
                        mobileOpen ? 'translate-x-0' : '-translate-x-full'
                    )}
                >
                    <button
                        type="button"
                        onClick={onMobileClose}
                        className="absolute right-3 top-3 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Fechar menu"
                    >
                        <X size={20} />
                    </button>
                    {content}
                </aside>
            </div>
        );
    }

    return (
        // O espaço no layout segue só o estado fixado (isCollapsed). A expansão
        // pelo hover fica por cima do conteúdo, sem empurrar a página.
        <div className={cn("relative shrink-0 transition-[width] duration-300 ease-in-out", isCollapsed ? "w-20" : "w-64")}>
        <aside
            onMouseEnter={() => {
                if (isCollapsed) {
                    setIsHovered(true);
                }
            }}
            onMouseLeave={() => {
                if (isCollapsed) {
                    setIsHovered(false);
                }
            }}
            className={cn(
                "absolute inset-y-0 left-0 z-40 bg-black border-r border-white/10 flex flex-col transition-all duration-300 ease-in-out text-white overflow-hidden",
                effectiveCollapsed ? "w-20 p-4" : "w-64 p-6"
            )}
        >
            {content}
        </aside>
        </div>
    );
};
