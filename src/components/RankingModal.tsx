import React from 'react';
import { Modal } from './ui/modal';
import { cn } from '../lib/utils';

// Selo de posição do pódio (1º/2º/3º), igual ao da tela de Métricas.
const PODIUM_BADGE = [
    'bg-status-iniciando/15 text-status-iniciando',
    'bg-status-pendente/15 text-status-pendente',
    'bg-status-noshow/15 text-status-noshow',
];

const NameCell = ({ name, rank, className }: { name: string; rank: number; className: string }) => (
    <div className={cn('flex items-center gap-2 font-medium text-foreground text-sm min-w-0', className)} title={name}>
        {PODIUM_BADGE[rank] && (
            <span className={cn('shrink-0 inline-flex items-center justify-center min-w-7 h-5 px-1.5 rounded-full text-xs font-bold tabular-nums', PODIUM_BADGE[rank])}>
                {rank + 1}º
            </span>
        )}
        <span className="truncate">{name}</span>
    </div>
);

interface RankingModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: any[];
    type: string;
    // Visão "Para outros setores": a coluna mostra o total de agendamentos marcados
    // como responsável, já que "Total Recebido" (como atendente) é sempre 0 ali.
    showTotal?: boolean;
}

export const RankingModal: React.FC<RankingModalProps> = ({ isOpen, onClose, title, data, type, showTotal }) => {
    const isSdrRanking = type === 'SDR' || type === 'Leads' || type === 'sdr';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            maxWidthClass={isSdrRanking ? "max-w-7xl" : "max-w-5xl"}
        >
            {/* Tabela larga: no celular rola na horizontal (cabeçalho e linhas juntos) */}
            <div className="mt-4 overflow-x-auto overscroll-x-contain">
                <div className={cn(
                    "grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground mb-3 px-4 uppercase tracking-wider",
                    isSdrRanking ? "min-w-[1000px]" : "min-w-[800px]"
                )}>
                    {isSdrRanking ? (
                        <>
                            <div className="col-span-2">Nome</div>
                            <div className="col-span-1 text-center">Total Agendado</div>
                            <div className="col-span-1 text-center text-status-realizado">Realizado</div>
                            <div className="col-span-1 text-center text-status-cancelado">Cancelado</div>
                            <div className="col-span-1 text-center text-status-esquecimento">Esquecimento</div>
                            <div className="col-span-1 text-center text-status-noshow">No-show</div>
                            <div className="col-span-1 text-center text-status-reagendado">Reagendado</div>
                            <div className="col-span-1 text-center">Lig. Closer/Gold</div>
                            <div className="col-span-2 text-center">Reagendamento Closer</div>
                            <div className="col-span-1 text-center">Upgrade</div>
                        </>
                    ) : (
                        <>
                            <div className="col-span-3">Nome</div>
                            <div className="col-span-2 text-center">{showTotal ? 'Agendamentos' : 'Total Recebido'}</div>
                            <div className="col-span-1 text-center text-status-realizado">Realizado</div>
                            <div className="col-span-1 text-center text-status-cancelado">Cancelado</div>
                            <div className="col-span-2 text-center text-status-esquecimento">Esquecimento</div>
                            <div className="col-span-1 text-center text-status-noshow">No-show</div>
                            <div className="col-span-2 text-center text-status-reagendado">Reagendado</div>
                        </>
                    )}
                </div>

                <div className={cn(
                    // dvh desconta as barras do navegador no celular; sem suporte, fica o 60vh
                    "space-y-1 max-h-[60vh] supports-[height:100dvh]:max-h-[60dvh] overflow-y-auto pr-2 custom-scrollbar",
                    isSdrRanking ? "min-w-[1000px]" : "min-w-[800px]"
                )}>
                    {data.map((item, idx) => {
                        const rank: number = item.originalRank !== undefined ? item.originalRank : idx;

                        return (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg bg-background transition-colors border-b border-border/10">
                                {isSdrRanking ? (
                                    <>
                                        <NameCell name={item.name} rank={rank} className="col-span-2" />
                                        <div className="col-span-1 text-center font-bold text-foreground text-xs">
                                            {item.total}
                                        </div>
                                        <div className="col-span-1 text-center font-bold text-status-realizado text-xs">
                                            {item.Realizado}
                                        </div>
                                        <div className="col-span-1 text-center text-status-cancelado text-xs">
                                            {item.Cancelado}
                                        </div>
                                        <div className="col-span-1 text-center text-status-esquecimento text-xs">
                                            {item.Esquecimento}
                                        </div>
                                        <div className="col-span-1 text-center text-status-noshow text-xs">
                                            {item['No-show']}
                                        </div>
                                        <div className="col-span-1 text-center text-status-reagendado text-xs">
                                            {item.Reagendado}
                                        </div>
                                        <div className="col-span-1 text-center text-foreground text-xs font-medium">
                                            {item.ligacao}
                                        </div>
                                        <div className="col-span-2 text-center text-foreground text-xs font-medium">
                                            {item.reagendamento}
                                        </div>
                                        <div className="col-span-1 text-center text-foreground text-xs font-medium">
                                            {item.upgrade}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <NameCell name={item.name} rank={rank} className="col-span-3" />
                                        <div className="col-span-2 text-center font-bold text-foreground text-xs">
                                            {showTotal ? item.total : item.totalRecebido}
                                        </div>
                                        <div className="col-span-1 text-center font-bold text-status-realizado text-xs">
                                            {item.Realizado}
                                        </div>
                                        <div className="col-span-1 text-center text-status-cancelado text-xs">
                                            {item.Cancelado}
                                        </div>
                                        <div className="col-span-2 text-center text-status-esquecimento text-xs">
                                            {item.Esquecimento}
                                        </div>
                                        <div className="col-span-1 text-center text-status-noshow text-xs">
                                            {item['No-show']}
                                        </div>
                                        <div className="col-span-2 text-center text-status-reagendado text-xs">
                                            {item.Reagendado}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
};
