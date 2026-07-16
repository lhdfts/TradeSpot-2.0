import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../lib/firebase';
import { 
    History, 
    Search, 
    ChevronDown, 
    ChevronUp, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    Coffee, 
    Clock, 
    UserCheck, 
    Phone, 
    ShieldAlert, 
    Calendar,
    RefreshCw
} from 'lucide-react';
import { cn } from '../components/ui/button';

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
    client?: {
        name: string;
        phone: string;
    } | null;
}

export const Logs: React.FC = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<ExecutionLog[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    // Filtros
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [executionTypeFilter, setExecutionTypeFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('');

    const fetchLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const authHeaders = await getAuthHeaders();
            let url = '/api/execution-logs';
            if (dateFilter) {
                // If specific date is selected, filter start/end for that day
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
        if (user && ['Admin', 'Dev'].includes(user.role)) {
            fetchLogs();
        }
    }, [user, dateFilter]);

    // Verificação de permissão
    if (!user || !['Admin', 'Dev'].includes(user.role)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                    <ShieldAlert size={32} />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h2>
                <p className="text-muted-foreground max-w-md">
                    Esta tela é restrita exclusivamente a administradores e desenvolvedores do sistema.
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
                const clientPhone = log.client?.phone?.toLowerCase() || '';
                const attendantName = log.selected_attendant_name?.toLowerCase() || '';
                if (!clientName.includes(term) && !clientPhone.includes(term) && !attendantName.includes(term)) {
                    return false;
                }
            }
            return true;
        });
    }, [logs, executionTypeFilter, searchTerm]);

    const toggleRow = (id: string) => {
        setExpandedRowId(prev => (prev === id ? null : id));
    };

    const formatDate = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).format(date);
        } catch {
            return isoString;
        }
    };

    const formatPhone = (phone?: string) => {
        if (!phone) return 'Não informado';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        }
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
        }
        return phone;
    };

    const getReasonBadge = (reason: string, selected?: boolean) => {
        const lower = reason.toLowerCase();
        if (selected || lower.includes('recebeu') || lower.includes('selecionado')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
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

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                        <History className="text-primary w-8 h-8 shrink-0" />
                        Logs de Distribuição
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Acompanhe o histórico e a auditoria das decisões de distribuição automática do sistema.
                    </p>
                </div>

                <button
                    onClick={fetchLogs}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                >
                    <RefreshCw size={16} className={cn(loading && "animate-spin")} />
                    Atualizar Logs
                </button>
            </div>

            {/* Filtros e Busca */}
            <div className="bg-card/80 backdrop-blur-md border border-border/60 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por aluno, telefone ou atendente..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background/80 border border-input text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                        />
                    </div>

                    <div className="relative">
                        <select
                            value={executionTypeFilter}
                            onChange={e => setExecutionTypeFilter(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-background/80 border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                        >
                            <option value="all">Todos os tipos de execução</option>
                            <option value="Distribuição Automática">Distribuição Automática</option>
                        </select>
                    </div>

                    <div className="relative">
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-background/80 border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                        />
                        {dateFilter && (
                            <button
                                onClick={() => setDateFilter('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                            >
                                Limpar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabela de Logs */}
            <div className="bg-card/90 backdrop-blur-md border border-border/60 rounded-2xl shadow-md overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <RefreshCw size={28} className="animate-spin text-primary mb-3" />
                        <p className="text-sm font-medium">Carregando logs de execução...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <AlertCircle size={32} className="text-destructive mb-3" />
                        <p className="text-foreground font-semibold mb-1">Ocorreu um erro</p>
                        <p className="text-muted-foreground text-sm max-w-md mb-4">{error}</p>
                        <button
                            onClick={fetchLogs}
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                        >
                            Tentar Novamente
                        </button>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <History size={36} className="text-muted-foreground/50 mb-3" />
                        <p className="text-foreground font-semibold">Nenhum log encontrado</p>
                        <p className="text-muted-foreground text-sm mt-1">
                            {searchTerm || dateFilter || executionTypeFilter !== 'all'
                                ? 'Nenhum registro corresponde aos filtros selecionados.'
                                : 'As distribuições automáticas registradas aparecerão aqui.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                    <th className="py-3.5 px-5">Data/Hora</th>
                                    <th className="py-3.5 px-5">Aluno / Telefone</th>
                                    <th className="py-3.5 px-5">Tipo de Execução</th>
                                    <th className="py-3.5 px-5">Atendente Selecionado</th>
                                    <th className="py-3.5 px-5 text-right">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40 text-sm">
                                {filteredLogs.map(log => {
                                    const isExpanded = expandedRowId === log.id;
                                    return (
                                        <React.Fragment key={log.id}>
                                            <tr 
                                                onClick={() => toggleRow(log.id)}
                                                className={cn(
                                                    "hover:bg-muted/30 transition-colors cursor-pointer select-none",
                                                    isExpanded && "bg-muted/40 font-medium"
                                                )}
                                            >
                                                <td className="py-4 px-5 text-foreground/90 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-muted-foreground shrink-0" />
                                                        <span>{formatDate(log.created_at)}</span>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-foreground">
                                                            {log.client?.name || 'Aluno Desconhecido'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                            <Phone size={11} />
                                                            {formatPhone(log.client?.phone)}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-5 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                                        {log.execution_type}
                                                    </span>
                                                </td>

                                                <td className="py-4 px-5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <UserCheck size={16} className="text-emerald-500 shrink-0" />
                                                        <span className="text-foreground font-medium">
                                                            {log.selected_attendant_name || 'Não informado'}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-5 text-right whitespace-nowrap">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleRow(log.id);
                                                        }}
                                                        className={cn(
                                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200",
                                                            isExpanded 
                                                                ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                                                : "bg-background/80 text-foreground hover:bg-muted border-border/80"
                                                        )}
                                                    >
                                                        <span>{isExpanded ? 'Minimizar' : 'Verificações'}</span>
                                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Sanfona (Accordion) de Verificações */}
                                            {isExpanded && (
                                                <tr className="bg-muted/15 border-b border-border/60">
                                                    <td colSpan={5} className="py-4 px-6 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="bg-background/90 rounded-xl p-4 sm:p-5 border border-border/70 shadow-inner space-y-3">
                                                            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                                                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                                    <span>Verificações Feitas no Algoritmo para Esta Distribuição</span>
                                                                    <span className="px-2 py-0.5 rounded-full bg-muted text-foreground font-normal">
                                                                        {(log.checks_log || []).length} atendentes analisados
                                                                    </span>
                                                                </h4>
                                                                <span className="text-xs text-muted-foreground font-mono">
                                                                    ID: {log.id.slice(0, 8)}...
                                                                </span>
                                                            </div>

                                                            {(!log.checks_log || log.checks_log.length === 0) ? (
                                                                <p className="text-xs text-muted-foreground italic py-2">
                                                                    Nenhum detalhe de verificação foi gravado para esta execução.
                                                                </p>
                                                            ) : (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                                                                    {log.checks_log.map((check, index) => {
                                                                        const isSelected = check.selected || check.name === log.selected_attendant_name;
                                                                        return (
                                                                            <div
                                                                                key={index}
                                                                                className={cn(
                                                                                    "flex items-center justify-between p-3 rounded-xl border text-sm transition-all",
                                                                                    isSelected 
                                                                                        ? "bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-500/5" 
                                                                                        : "bg-card/60 border-border/50 hover:bg-card"
                                                                                )}
                                                                            >
                                                                                <span className="font-semibold text-foreground flex items-center gap-2">
                                                                                    {isSelected && (
                                                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
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
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
