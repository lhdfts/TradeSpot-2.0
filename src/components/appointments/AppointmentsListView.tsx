// Estrutura única das listas de agendamentos (Meus e Todos). Cada página só
// fornece os dados já filtrados, os filtros dela e as colunas extras.
//
// Pensado para não deslocar o layout:
//  - colunas com largura fixa (table-fixed), iguais em toda página e filtro;
//  - enquanto a primeira busca não termina, linhas-esqueleto da mesma altura
//    das reais, em vez do aviso de lista vazia;
//  - numa nova busca, a lista atual continua no lugar (esmaecida);
//  - o "Limpar filtros" reserva o espaço mesmo quando está escondido.
//
// Filtros: a barra mostra só pesquisa + filtros principais; o resto fica no
// painel "Filtros avançados", que abre animando altura e opacidade (padrão
// "Base Collapsible" do 21st.dev).
import React, { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, CalendarDays, CalendarPlus, ChevronDown, Clock, List, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import type { Appointment } from '../../types';
import { cn } from '../../lib/utils';
import { staggerStyle } from '../../lib/motion';
import { openUnlessSelecting } from '../../lib/dates';
import { Button } from '../ui/button';
import { PaginationBar } from '../ui/pagination';
import { EmptyState } from '../ui/empty-state';
import { FloatingInput } from '../FloatingInput';
import { CalendarView } from '../CalendarView';
import { StatusBadge } from './StatusBadge';
import { AppointmentDate, CopyPhoneButton, LeadCell } from './AppointmentCells';

export type ViewMode = 'table' | 'calendar';

export interface ExtraColumn {
    header: string;
    /** Classe de largura da coluna, ex.: "w-[12%]" (colunas de texto cortam com reticências). */
    width: string;
    render: (appt: Appointment) => React.ReactNode;
}

interface AppointmentsListViewProps {
    /** Já filtrados e ordenados pela página. */
    appointments: Appointment[];
    loading: boolean;
    loaded: boolean;
    /** A busca do período bateu no limite do servidor: a lista está incompleta. */
    truncated?: boolean;
    search: string;
    onSearchChange: (value: string) => void;
    /** Filtros sempre visíveis na barra; recebem o modo para esconder os que não valem no calendário. */
    primaryFilters: (viewMode: ViewMode) => React.ReactNode;
    /** Filtros do painel "Filtros avançados". */
    advancedFilters: (viewMode: ViewMode) => React.ReactNode;
    /** Quantos filtros avançados estão fora do padrão (contador no botão). */
    advancedActiveCount: number;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
    page: number;
    onPageChange: (page: number) => void;
    pageSize: number;
    extraColumns?: ExtraColumn[];
    actionLabel: string;
    onOpen: (appt: Appointment) => void;
    onCreate: () => void;
    emptyDescription: string;
}

// Mesma altura de uma linha real: py-4 + linha de 24px + linha de 20px.
const SkeletonCell = ({ first, second }: { first: string; second?: string }) => (
    <td className="px-4 py-4">
        <div className="h-6 flex items-center">
            <div className={cn('h-3.5 rounded bg-muted/60 animate-shimmer', first)} />
        </div>
        <div className="h-5 flex items-center">
            {second && <div className={cn('h-3 rounded bg-muted/40 animate-shimmer', second)} />}
        </div>
    </td>
);

export const AppointmentsListView: React.FC<AppointmentsListViewProps> = ({
    appointments,
    loading,
    loaded,
    truncated,
    search,
    onSearchChange,
    primaryFilters,
    advancedFilters,
    advancedActiveCount,
    hasActiveFilters,
    onClearFilters,
    page,
    onPageChange,
    pageSize,
    extraColumns = [],
    actionLabel,
    onOpen,
    onCreate,
    emptyDescription,
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const advancedPanelId = useId();

    // Esqueleto só quando não há nada para mostrar ainda; com dados antigos na
    // tela, eles ficam (esmaecidos) até a busca nova chegar.
    const showSkeleton = !loaded || (loading && appointments.length === 0);
    const isEmpty = !showSkeleton && appointments.length === 0;

    const totalPages = Math.ceil(appointments.length / pageSize);
    const paginated = appointments.slice((page - 1) * pageSize, page * pageSize);

    const headerActions = document.getElementById('header-actions');

    const openRow = (appt: Appointment) => openUnlessSelecting(() => onOpen(appt));
    const actionButton = (appt: Appointment, className?: string) => (
        <Button
            variant="secondary"
            size="sm"
            className={className}
            onClick={(e) => {
                e.stopPropagation();
                onOpen(appt);
            }}
        >
            {actionLabel}
        </Button>
    );

    const pagination = (className?: string) => (
        <PaginationBar
            className={className}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            totalItems={appointments.length}
            pageSize={pageSize}
        />
    );

    const emptyState = hasActiveFilters ? (
        <EmptyState
            icons={[SearchX]}
            title="Nenhum agendamento com esses filtros"
            description={search
                ? `Nada encontrado para "${search}". Confira a grafia ou busque pelo telefone.`
                : 'Tente ampliar o período ou remover algum filtro.'}
            action={{ label: 'Limpar filtros', icon: X, onClick: onClearFilters }}
        />
    ) : (
        <EmptyState
            icons={[CalendarDays, Clock, CalendarPlus]}
            title="Nenhum agendamento a partir de hoje"
            description={emptyDescription}
            action={{ label: 'Criar agendamento', icon: CalendarPlus, onClick: onCreate }}
        />
    );

    return (
        <div className="space-y-6">
            {headerActions && createPortal(
                <div className="flex flex-col text-right mr-4 min-w-[5.5rem]">
                    <span className="text-[10px] tracking-wider text-secondary font-bold uppercase">Quantidade</span>
                    <span className="text-xl font-bold text-foreground leading-none tabular-nums">
                        {showSkeleton ? '–' : appointments.length}
                    </span>
                </div>,
                headerActions
            )}

            {truncated && !loading && (
                <div className="p-3 rounded-lg border border-[#FF9100]/40 bg-[#FF9100]/10 text-sm text-foreground">
                    O período selecionado tem mais agendamentos do que o limite de carregamento. A lista está incompleta — reduza o período.
                </div>
            )}

            {/* Barra de controles */}
            <div className="bg-surface p-4 rounded-lg border border-border shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex-1 min-w-[220px]">
                        <FloatingInput
                            label="Pesquisa"
                            startIcon={<Search size={18} />}
                            value={search}
                            onChange={e => onSearchChange(e.target.value)}
                            placeholder=""
                            className="bg-background"
                        />
                    </div>

                    {primaryFilters(viewMode)}

                    <Button
                        variant="outline"
                        onClick={() => setAdvancedOpen(open => !open)}
                        aria-expanded={advancedOpen}
                        aria-controls={advancedPanelId}
                        className={cn('h-11 gap-2', advancedOpen && 'bg-accent text-accent-foreground')}
                        title="Filtros avançados"
                    >
                        <SlidersHorizontal size={16} />
                        <span className="hidden sm:inline">Filtros avançados</span>
                        {advancedActiveCount > 0 && (
                            <span
                                className="grid place-items-center min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums animate-in zoom-in-50 duration-200"
                                aria-label={`${advancedActiveCount} filtro${advancedActiveCount > 1 ? 's' : ''} avançado${advancedActiveCount > 1 ? 's' : ''} ativo${advancedActiveCount > 1 ? 's' : ''}`}
                            >
                                {advancedActiveCount}
                            </span>
                        )}
                        <ChevronDown size={16} className={cn('transition-transform duration-200', advancedOpen && 'rotate-180')} />
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={onClearFilters}
                        className={cn(
                            'h-11 text-secondary hover:text-foreground transition-opacity duration-200',
                            !hasActiveFilters && 'invisible opacity-0'
                        )}
                        title="Voltar aos filtros padrão"
                        tabIndex={hasActiveFilters ? 0 : -1}
                        aria-hidden={!hasActiveFilters}
                    >
                        <X size={16} className="mr-1" />
                        Limpar filtros
                    </Button>

                    {/* Seletor de visualização: sempre na barra, encostado à direita */}
                    <div className="ml-auto flex bg-background rounded-lg p-1 border border-border h-11 items-center">
                        <button
                            onClick={() => setViewMode('table')}
                            aria-pressed={viewMode === 'table'}
                            aria-label="Ver em lista"
                            className={`h-full aspect-square rounded flex items-center justify-center transition-all duration-200 active:scale-90 ${viewMode === 'table' ? 'bg-gray-200 dark:bg-surface shadow text-black dark:text-white' : 'text-secondary hover:text-primary'}`}
                            title="Lista"
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            aria-pressed={viewMode === 'calendar'}
                            aria-label="Ver em calendário"
                            className={`h-full aspect-square rounded flex items-center justify-center transition-all duration-200 active:scale-90 ${viewMode === 'calendar' ? 'bg-gray-200 dark:bg-surface shadow text-black dark:text-white' : 'text-secondary hover:text-primary'}`}
                            title="Calendário"
                        >
                            <CalendarIcon size={18} />
                        </button>
                    </div>
                </div>

                {/* Painel de filtros avançados: fechado, sai da ordem de tabulação (inert) */}
                <div
                    id={advancedPanelId}
                    inert={!advancedOpen}
                    className={cn(
                        'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
                        advancedOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    )}
                >
                    <div className="overflow-hidden">
                        {/* pt-5: espaço para o rótulo flutuante dos campos, que sobe acima da borda */}
                        <div className="mt-4 pt-5 border-t border-border flex flex-wrap items-end gap-2">
                            {advancedFilters(viewMode)}
                        </div>
                    </div>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <CalendarView appointments={appointments} onEditAppointment={onOpen} isSearching={!!search} />
            ) : isEmpty ? (
                emptyState
            ) : (
                <>
                    {/* Tabela (desktop) */}
                    <div
                        className="hidden md:block relative bg-surface rounded-lg border border-border overflow-hidden shadow-lg"
                        aria-busy={loading}
                    >
                        {/* Barra de progresso sobreposta: não ocupa espaço */}
                        {loading && <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-primary/40 animate-shimmer" />}
                        <div className="overflow-x-auto">
                            {/* Colunas de conteúdo previsível em px; as de nomes em %; Aluno(a) fica com o resto. */}
                            <table className={cn('w-full table-fixed text-left', extraColumns.length ? 'min-w-[1040px]' : 'min-w-[860px]')}>
                                <colgroup>
                                    <col className="w-[150px]" />
                                    <col />
                                    <col className={extraColumns.length ? 'w-[10%]' : 'w-[14%]'} />
                                    <col className="w-[150px]" />
                                    {extraColumns.map(col => <col key={col.header} className={col.width} />)}
                                    <col className={extraColumns.length ? 'w-[12%]' : 'w-[16%]'} />
                                    <col className="w-[120px]" />
                                </colgroup>
                                <thead className="bg-[#141414] text-white text-xs uppercase tracking-wider font-bold" style={{ backgroundColor: '#141414' }}>
                                    <tr>
                                        <th className="px-4 py-4">Data/Hora</th>
                                        <th className="px-4 py-4">Aluno(a)</th>
                                        <th className="px-4 py-4">Tipo</th>
                                        <th className="px-4 py-4">Status</th>
                                        {extraColumns.map(col => <th key={col.header} className="px-4 py-4">{col.header}</th>)}
                                        <th className="px-4 py-4">Atendente</th>
                                        <th className="px-4 py-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className={cn('divide-y divide-border transition-opacity duration-200', loading && !showSkeleton && 'opacity-60')}>
                                    {showSkeleton
                                        ? Array.from({ length: pageSize }, (_, i) => (
                                            <tr key={i} aria-hidden>
                                                <SkeletonCell first="w-20" second="w-14" />
                                                <SkeletonCell first="w-40" second="w-28" />
                                                <SkeletonCell first="w-20" />
                                                <SkeletonCell first="w-20" />
                                                {extraColumns.map(col => <SkeletonCell key={col.header} first="w-24" />)}
                                                <SkeletonCell first="w-24" />
                                                <SkeletonCell first="w-16 mx-auto" />
                                            </tr>
                                        ))
                                        : paginated.map((appt, i) => (
                                            <tr
                                                key={appt.id}
                                                style={staggerStyle(i, 30)}
                                                onClick={openRow(appt)}
                                                className="animate-fade-up hover:bg-background/50 transition-colors group cursor-pointer"
                                            >
                                                <td className="px-4 py-4">
                                                    <AppointmentDate date={appt.date} time={appt.time} />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <LeadCell lead={appt.lead} phone={appt.phone} />
                                                </td>
                                                <td className="px-4 py-4 text-sm text-foreground truncate" title={appt.type}>{appt.type}</td>
                                                <td className="px-4 py-4">
                                                    <StatusBadge status={appt.status} />
                                                </td>
                                                {extraColumns.map(col => (
                                                    <td key={col.header} className="px-4 py-4 text-sm text-foreground truncate">
                                                        {col.render(appt)}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-4 text-sm text-foreground truncate">
                                                    {appt.attendantName || appt.attendantId}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    {actionButton(appt)}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                        {!showSkeleton && pagination('p-4 border-t border-border')}
                    </div>

                    {/* Cards (mobile) */}
                    <div className={cn('md:hidden space-y-4 transition-opacity duration-200', loading && !showSkeleton && 'opacity-60')} aria-busy={loading}>
                        {showSkeleton
                            ? Array.from({ length: 3 }, (_, i) => (
                                <div key={i} aria-hidden className="h-[178px] bg-surface rounded-lg border border-border p-4 space-y-3">
                                    <div className="h-4 w-1/2 rounded bg-muted/60 animate-shimmer" />
                                    <div className="h-3 w-1/3 rounded bg-muted/40 animate-shimmer" />
                                    <div className="h-3 w-2/3 rounded bg-muted/40 animate-shimmer" />
                                </div>
                            ))
                            : paginated.map((appt, i) => (
                                <div
                                    key={appt.id}
                                    style={staggerStyle(i, 40)}
                                    onClick={openRow(appt)}
                                    className="animate-fade-up bg-surface p-4 rounded-lg border border-border shadow-sm space-y-3 cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-foreground font-semibold truncate">{appt.lead}</h3>
                                            <div className="flex items-center gap-3 text-sm text-secondary mt-1">
                                                {appt.phone}
                                                <CopyPhoneButton phone={appt.phone} size={14} />
                                            </div>
                                        </div>
                                        <StatusBadge status={appt.status} className="shrink-0" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-secondary block text-xs">Data</span>
                                            <AppointmentDate date={appt.date} time={appt.time} inline />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-secondary block text-xs">Tipo</span>
                                            <span className="text-foreground block truncate">{appt.type}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-border flex justify-end">
                                        {actionButton(appt, 'w-full')}
                                    </div>
                                </div>
                            ))}
                        {!showSkeleton && pagination()}
                    </div>
                </>
            )}
        </div>
    );
};
