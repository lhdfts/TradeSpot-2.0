import React, { useState, useEffect, useMemo } from 'react';
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
    UserCheck,
    Phone,
    ShieldAlert,
    Calendar,
    RefreshCw
} from 'lucide-react';
import { cn } from '../components/ui/button';
import { Button } from '../components/ui/button';
import { FloatingInput } from '../components/FloatingInput';
import { FloatingSelect } from '../components/FloatingSelect';

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
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

    // Filtros
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [executionTypeFilter, setExecutionTypeFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('');

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
        <div className="space-y-6">
            {portalContainer && createPortal(
                <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading} className="mr-2">
                    <RefreshCw size={16} className={cn("mr-2", loading && "animate-spin")} />
                    Atualizar Logs
                </Button>,
                portalContainer
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="w-72">
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
                            { value: 'Distribuição Automática', label: 'Distribuição Automática' }
                        ]}
                        className="w-56"
                    />
                    <div className="w-48">
                        <FloatingInput
                            label="Filtrar por data"
                            type="date"
                            value={dateFilter}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-surface rounded-lg border border-border overflow-hidden shadow-lg">
                <table className="w-full text-left">
                    <thead className="bg-[#141414] text-white text-xs uppercase tracking-wider font-bold" style={{ backgroundColor: '#141414' }}>
                        <tr>
                            <th className="px-6 py-4">Data/Hora</th>
                            <th className="px-6 py-4">Aluno / Telefone</th>
                            <th className="px-6 py-4">Tipo de Execução</th>
                            <th className="px-6 py-4">Atendente Selecionado</th>
                            <th className="px-6 py-4 text-right">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                    Carregando logs de execução...
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-destructive">
                                    {error}
                                </td>
                            </tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                    {searchTerm || dateFilter || executionTypeFilter !== 'all'
                                        ? 'Nenhum registro corresponde aos filtros selecionados.'
                                        : 'Nenhum log encontrado.'}
                                </td>
                            </tr>
                        ) : (
                            filteredLogs.map(log => {
                                const isExpanded = expandedRowId === log.id;
                                return (
                                    <React.Fragment key={log.id}>
                                        <tr
                                            onClick={() => toggleRow(log.id)}
                                            className={cn(
                                                "hover:bg-background/50 transition-colors cursor-pointer select-none",
                                                isExpanded && "bg-background/80 font-medium"
                                            )}
                                        >
                                            <td className="px-6 py-4 text-foreground font-medium whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-muted-foreground shrink-0" />
                                                    <span>{formatDate(log.created_at)}</span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-foreground font-medium">
                                                <div className="flex flex-col">
                                                    <span>{log.client?.name || 'Aluno Desconhecido'}</span>
                                                    <span className="text-xs text-muted-foreground font-normal flex items-center gap-1 mt-0.5">
                                                        <Phone size={11} />
                                                        {formatPhone(log.client?.phone)}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-foreground whitespace-nowrap">
                                                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                                    {log.execution_type}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-foreground font-medium whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <UserCheck size={16} className="text-emerald-500 shrink-0" />
                                                    <span>{log.selected_attendant_name || 'Não informado'}</span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleRow(log.id);
                                                    }}
                                                    className={cn(
                                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200",
                                                        isExpanded
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-background/50 text-foreground hover:bg-background border-border/80"
                                                    )}
                                                >
                                                    <span>{isExpanded ? 'Minimizar' : 'Verificações'}</span>
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </Button>
                                            </td>
                                        </tr>

                                        {/* Sanfona (Accordion) de Verificações */}
                                        {isExpanded && (
                                            <tr className="bg-background/30 border-b border-border">
                                                <td colSpan={5} className="px-6 py-4 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="bg-surface rounded-lg p-4 sm:p-5 border border-border shadow-inner space-y-3">
                                                        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                                <span>Verificações Feitas no Algoritmo para Esta Distribuição</span>
                                                                <span className="px-2 py-0.5 rounded-full bg-background text-foreground font-normal border border-border/60">
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
                                                                                "flex items-center justify-between p-3 rounded-lg border text-sm transition-all",
                                                                                isSelected
                                                                                    ? "bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-500/5"
                                                                                    : "bg-background/50 border-border/80 hover:bg-background"
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
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
