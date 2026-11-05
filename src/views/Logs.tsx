import React, { useState, useEffect, useMemo } from 'react';
import { staggerStyle } from '../lib/motion';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../lib/firebase';
import {
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Coffee,
    Clock,
    ShieldAlert,
    RefreshCw,
    SearchX,
    ScrollText
} from 'lucide-react';
import { cn } from '../components/ui/button';
import { Button } from '../components/ui/button';
import { FloatingInput } from '../components/FloatingInput';
import { FloatingSelect } from '../components/FloatingSelect';
import { Pagination } from '../components/ui/pagination';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';

export interface CheckLogItem {
    name: string;
    reason: string;
    selected?: boolean;
}

export interface ExecutionLog {
    id: string;
    created_at: string;
    client_id: string;
    execution_type: string;
    selected_attendant_id: string;
    selected_attendant_name: string;
    appointment_id?: string;
    checks_log: CheckLogItem[];
    old_value?: string | null;
    new_value?: string | null;
    changed_by_name?: string | null;
    client?: {
        name: string;
        phone: string | number;
    } | null;
}

const EXECUTION_TYPES = ['Distribuição Automática', 'Atribuição Manual', 'Alteração de Status', 'Alteração de Atendente', 'Alteração de Owner'];

// Nome exibido; o valor gravado no banco continua 'Alteração de Owner'.
const EXECUTION_TYPE_LABELS: Record<string, string> = { 'Alteração de Owner': 'Alteração de Responsável' };
const executionTypeLabel = (type: string) => EXECUTION_TYPE_LABELS[type] || type;

export const Logs: React.FC = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<ExecutionLog[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

    // Filtros
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [executionTypeFilter, setExecutionTypeFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('');

    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setPortalContainer(document.getElementById('header-actions'));
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const authHeaders = await getAuthHeaders();
            let url = '/api/execution-logs';
            if (dateFilter) {
                const startOfDay = `${dateFilter}T00:00:00`;
                const endOfDay = `${dateFilter}T23:59:59`;
                url += `?startDate=${encodeURIComponent(startOfDay)}&endDate=${encodeURIComponent(endOfDay)}`;
            }

            const response = await fetch(url, {
                headers: authHeaders
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Erro ao carregar os logs de execução.');
            }

            const data: ExecutionLog[] = await response.json();
            setLogs(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error('[LOGS VIEW] Error fetching logs:', err);
            setError(err.message || 'Erro ao buscar logs.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && ['Admin', 'Dev', 'Líder'].includes(user.role)) {
            fetchLogs();
        }
    }, [user, dateFilter]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, executionTypeFilter, dateFilter]);

    // Verificação de permissão
    if (!user || !['Admin', 'Dev', 'Líder'].includes(user.role)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                    <ShieldAlert size={32} />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h2>
                <p className="text-muted-foreground max-w-md">
                    Esta tela é restrita a administradores, líderes e desenvolvedores do sistema.
                </p>
            </div>
        );
    }

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            if (executionTypeFilter !== 'all' && log.execution_type !== executionTypeFilter) {
                return false;
            }
            if (searchTerm.trim() !== '') {
                const term = searchTerm.toLowerCase();
                const clientName = log.client?.name?.toLowerCase() || '';
                const clientPhone = log.client?.phone ? String(log.client.phone).toLowerCase() : '';
                const attendantName = log.selected_attendant_name?.toLowerCase() || '';
                const changedBy = log.changed_by_name?.toLowerCase() || '';
                const oldValue = log.old_value?.toLowerCase() || '';
                const newValue = log.new_value?.toLowerCase() || '';
                if (
                    !clientName.includes(term) &&
                    !clientPhone.includes(term) &&
                    !attendantName.includes(term) &&
                    !changedBy.includes(term) &&
                    !oldValue.includes(term) &&
                    !newValue.includes(term)
                ) {
                    return false;
                }
            }
            return true;
        });
    }, [logs, executionTypeFilter, searchTerm]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const toggleRow = (id: string) => {
        setExpandedRowId(prev => (prev === id ? null : id));
    };

    const formatDatePart = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleDateString('pt-BR');
        } catch {
            return isoString;
        }
    };

    const formatTimePart = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch {
            return '';
        }
    };

    const formatPhone = (phone?: string | null | number) => {
        if (!phone) return 'Não informado';
        return String(phone);
    };

    const getExecutionTypeBadge = (type: string) => {
        const styles: Record<string, string> = {
            'Distribuição Automática': 'bg-primary/10 text-primary border-primary/20',
            'Atribuição Manual': 'bg-status-realizado/10 text-status-realizado border-status-realizado/25',
            'Alteração de Status': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            'Alteração de Atendente': 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
            'Alteração de Owner': 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
        };
        return styles[type] || 'bg-muted text-muted-foreground border-border/50';
    };

    const getActionText = (log: ExecutionLog) => {
        switch (log.execution_type) {
            case 'Alteração de Status':
                return `${log.old_value || 'Não informado'} → ${log.new_value || 'Não informado'}`;
            case 'Alteração de Atendente':
            case 'Alteração de Owner':
                return `${log.old_value || 'Não informado'} → ${log.new_value || 'Não informado'}`;
            default:
                return `Atribuído para ${log.selected_attendant_name || 'Não informado'}`;
        }
    };

    const getReasonBadge = (reason: string, selected?: boolean) => {
        const lower = reason.toLowerCase();
        if (selected || lower.includes('recebeu') || lower.includes('selecionado')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-status-realizado/15 text-status-realizado border border-status-realizado/30">
                    <CheckCircle2 size={13} className="shrink-0" />
                    {reason}
                </span>
            );
        }
        if (lower.includes('pausa')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Coffee size={13} className="shrink-0" />
                    {reason}
                </span>
            );
        }
        if (lower.includes('escala') || lower.includes('horário')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-status-noshow/15 text-status-noshow border border-status-noshow/30">
                    <Clock size={13} className="shrink-0" />
                    {reason}
                </span>
            );
        }
        if (lower.includes('já possuia') || lower.includes('conflito') || lower.includes('limite')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    <XCircle size={13} className="shrink-0" />
                    {reason}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/50">
                <AlertCircle size={13} className="shrink-0" />
                {reason}
            </span>
        );
    };

    // checks_log pode ter sido gravado como string ou null
    const parseChecks = (log: ExecutionLog): CheckLogItem[] => {
        if (Array.isArray(log.checks_log)) return log.checks_log;
        if (typeof log.checks_log === 'string') {
            try {
                const parsed = JSON.parse(log.checks_log);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    const hasFilters = !!searchTerm || !!dateFilter || executionTypeFilter !== 'all';
    const clearFilters = () => {
        setSearchTerm('');
        setDateFilter('');
        setExecutionTypeFilter('all');
    };

    // Botão que abre/fecha as verificações da distribuição (tabela e cartões)
    const checksToggle = (log: ExecutionLog, isExpanded: boolean, className?: string) => (
        <Button
            variant="ghost"
            size="sm"
            aria-expanded={isExpanded}
            aria-controls={`checks-${log.id}`}
            onClick={(e) => {
                e.stopPropagation();
                toggleRow(log.id);
            }}
            className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150",
                isExpanded
                    ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground"
                    : "bg-background/50 text-foreground hover:bg-background border-border/80",
                className
            )}
        >
            <span>{isExpanded ? 'Ocultar verificações' : 'Ver verificações'}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>
    );

    // Sanfona (Accordion) de Verificações
    const checksPanel = (log: ExecutionLog, checks: CheckLogItem[]) => (
        <div id={`checks-${log.id}`} className="bg-surface rounded-lg p-4 sm:p-5 border border-border shadow-inner space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 motion-reduce:animate-none">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex flex-wrap items-center gap-1.5">
                    <span>Verificações Feitas no Algoritmo para Esta Distribuição</span>
                    <span className="px-2 py-0.5 rounded-full bg-background text-foreground font-normal border border-border/60">
                        {checks.length} atendentes analisados
                    </span>
                </h4>
                <span className="text-xs text-muted-foreground font-mono">
                    ID: {log.id.slice(0, 8)}...
                </span>
            </div>

            {checks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                    Nenhum detalhe de verificação foi gravado para esta execução.
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {checks.map((check, index) => {
                        const isSelected = check.selected || check.name === log.selected_attendant_name;
                        return (
                            <div
                                key={index}
                                className={cn(
                                    "flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border text-sm transition-colors",
                                    isSelected
                                        ? "bg-status-realizado/10 border-status-realizado/30"
                                        : "bg-background/50 border-border/80 hover:bg-background"
                                )}
                            >
                                <span className="font-semibold text-foreground flex items-center gap-2 min-w-0 break-words">
                                    {isSelected && (
                                        <span className="w-2 h-2 rounded-full bg-status-realizado shrink-0" />
                                    )}
                                    {check.name}
                                </span>

                                <div>
                                    {getReasonBadge(check.reason, check.selected)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const typeBadge = (log: ExecutionLog) => (
        <span className={cn("px-2.5 py-1 rounded-md text-xs font-semibold border whitespace-nowrap", getExecutionTypeBadge(log.execution_type))}>
            {executionTypeLabel(log.execution_type)}
        </span>
    );

    return (
        <div className="space-y-6">
            {portalContainer && createPortal(
                // No celular só o ícone, para caber ao lado do título
                <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading} className="mr-2 h-9 px-2.5 sm:h-8 sm:px-3" aria-label="Atualizar logs" title="Atualizar logs">
                    <RefreshCw size={16} className={cn("sm:mr-2", loading && "animate-spin motion-reduce:animate-none")} />
                    <span className="hidden sm:inline">Atualizar logs</span>
                </Button>,
                portalContainer
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                    <div className="w-full sm:w-72">
                        <FloatingInput
                            label="Pesquisar"
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <FloatingSelect
                        label="Tipo de execução"
                        value={executionTypeFilter}
                        onChange={(e: any) => setExecutionTypeFilter(e.target.value)}
                        options={[
                            { value: 'all', label: 'Todos os Tipos' },
                            ...EXECUTION_TYPES.map(type => ({ value: type, label: executionTypeLabel(type) }))
                        ]}
                        className="flex-1 min-w-[10rem] sm:flex-none sm:w-56"
                    />
                    <div className="flex-1 min-w-[10rem] sm:flex-none sm:w-48">
                        <FloatingInput
                            label="Filtrar por data"
                            type="date"
                            value={dateFilter}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="bg-surface rounded-lg border border-border p-4 space-y-3" aria-busy="true">
                    {Array.from({ length: 5 }, (_, i) => (
                        <Skeleton key={i} className="h-14 w-full rounded-md" />
                    ))}
                    <span className="sr-only">Carregando logs de execução…</span>
                </div>
            ) : error ? (
                <EmptyState
                    icons={[AlertCircle]}
                    title="Não foi possível carregar os logs"
                    description="Verifique a conexão e tente de novo."
                    action={{ label: 'Tentar de novo', icon: RefreshCw, onClick: fetchLogs }}
                />
            ) : filteredLogs.length === 0 ? (
                hasFilters ? (
                    <EmptyState
                        icons={[SearchX]}
                        title="Nenhum registro com esses filtros"
                        description="Tente outra data, outro tipo de execução ou limpe a pesquisa."
                        action={{ label: 'Limpar filtros', onClick: clearFilters }}
                    />
                ) : (
                    <EmptyState
                        icons={[ScrollText]}
                        title="Nenhum log ainda"
                        description="Cada distribuição automática, atribuição manual e mudança de status ou atendente aparece aqui, com quem fez e o motivo."
                        action={{ label: 'Atualizar logs', icon: RefreshCw, onClick: fetchLogs }}
                    />
                )
            ) : (
            <div style={staggerStyle(0, 80)} className="animate-fade-up bg-surface rounded-lg border border-border overflow-hidden shadow-sm">
                {/* Tabela (desktop) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#141414] text-white text-xs uppercase tracking-wider font-bold" style={{ backgroundColor: '#141414' }}>
                            <tr>
                                <th className="px-6 py-4">Data/Hora</th>
                                <th className="px-6 py-4">Aluno(a)</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Realizado Por</th>
                                <th className="px-6 py-4">Ação Realizada</th>
                                <th className="px-6 py-4 text-right">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedLogs.map(log => {
                                const isExpanded = expandedRowId === log.id;
                                const isDistribution = log.execution_type === 'Distribuição Automática';

                                return (
                                    <React.Fragment key={log.id}>
                                        <tr
                                            onClick={isDistribution ? () => toggleRow(log.id) : undefined}
                                            className={cn(
                                                "transition-colors",
                                                isDistribution ? "hover:bg-background/50 cursor-pointer select-none" : "hover:bg-background/50",
                                                isExpanded && "bg-background/80 font-medium"
                                            )}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-foreground font-medium">{formatDatePart(log.created_at)}</div>
                                                <div className="text-sm text-muted-foreground">{formatTimePart(log.created_at)}</div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="text-foreground font-medium">{log.client?.name || 'Aluno Desconhecido'}</div>
                                                <div className="text-sm text-muted-foreground">{formatPhone(log.client?.phone)}</div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {typeBadge(log)}
                                            </td>

                                            <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
                                                {log.changed_by_name || 'Sistema'}
                                            </td>

                                            <td className="px-6 py-4 text-sm text-foreground">
                                                {getActionText(log)}
                                            </td>

                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                {isDistribution ? checksToggle(log, isExpanded) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </td>
                                        </tr>

                                        {isExpanded && (
                                            <tr className="bg-background/30 border-b border-border">
                                                <td colSpan={6} className="px-6 py-4">
                                                    {checksPanel(log, parseChecks(log))}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Cartões (celular) */}
                <ul className="md:hidden divide-y divide-border">
                    {paginatedLogs.map(log => {
                        const isExpanded = expandedRowId === log.id;
                        const isDistribution = log.execution_type === 'Distribuição Automática';
                        return (
                            <li key={log.id} className={cn("p-4 space-y-3", isExpanded && "bg-background/50")}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-foreground font-semibold break-words">{log.client?.name || 'Aluno Desconhecido'}</div>
                                        <div className="text-sm text-muted-foreground tabular-nums">{formatPhone(log.client?.phone)}</div>
                                    </div>
                                    <div className="shrink-0 text-right text-sm tabular-nums">
                                        <div className="text-foreground">{formatDatePart(log.created_at)}</div>
                                        <div className="text-muted-foreground">{formatTimePart(log.created_at)}</div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {typeBadge(log)}
                                    <span className="text-xs text-muted-foreground">por {log.changed_by_name || 'Sistema'}</span>
                                </div>
                                <p className="text-sm text-foreground break-words">{getActionText(log)}</p>
                                {isDistribution && checksToggle(log, isExpanded, 'w-full justify-center')}
                                {isExpanded && checksPanel(log, parseChecks(log))}
                            </li>
                        );
                    })}
                </ul>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-border">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>
            )}
        </div>
    );
};
