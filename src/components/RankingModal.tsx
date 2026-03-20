import React from 'react';
import { Modal } from './ui/modal';
import { cn } from '../lib/utils';

interface RankingModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: any[];
    type: 'sdr' | 'closer';
}

export const RankingModal: React.FC<RankingModalProps> = ({ isOpen, onClose, title, data, type }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            maxWidthClass={type === 'sdr' ? "max-w-7xl" : "max-w-5xl"}
        >
            <div className="mt-4 overflow-x-auto">
                <div className={cn(
                    "grid grid-cols-12 text-[10px] font-semibold text-secondary mb-3 px-4 uppercase tracking-wider",
                    type === 'sdr' ? "min-w-[1000px]" : "min-w-[800px]"
                )}>
                    {type === 'sdr' ? (
                        <>
                            <div className="col-span-2">Nome</div>
                            <div className="col-span-1 text-center">Total Agendado</div>
                            <div className="col-span-1 text-center text-emerald-500">Realizado</div>
                            <div className="col-span-1 text-center text-red-500">Cancelado</div>
                            <div className="col-span-1 text-center text-violet-500">Esquecimento</div>
                            <div className="col-span-1 text-center text-rose-500">No-show</div>
                            <div className="col-span-1 text-center text-blue-500">Reagendado</div>
                            <div className="col-span-1 text-center text-blue-400">Lig. Closer/Gold</div>
                            <div className="col-span-2 text-center text-orange-400">Reagendamento Closer</div>
                            <div className="col-span-1 text-center text-purple-400">Upgrade</div>
                        </>
                    ) : (
                        <>
                            <div className="col-span-3">Nome</div>
                            <div className="col-span-2 text-center">Total Recebido</div>
                            <div className="col-span-1 text-center text-emerald-500">Realizado</div>
                            <div className="col-span-1 text-center text-red-500">Cancelado</div>
                            <div className="col-span-2 text-center text-violet-500">Esquecimento</div>
                            <div className="col-span-1 text-center text-rose-500">No-show</div>
                            <div className="col-span-2 text-center text-blue-500">Reagendado</div>
                        </>
                    )}
                </div>

                <div className={cn(
                    "space-y-1 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar",
                    type === 'sdr' ? "min-w-[1000px]" : "min-w-[800px]"
                )}>
                    {data.map((item, idx) => {
                        let rowStyle = 'bg-background border-l-4 border-transparent';
                        const rank = item.originalRank !== undefined ? item.originalRank : idx;

                        if (rank === 0) rowStyle = 'bg-yellow-500/5 border-l-4 border-yellow-500';
                        else if (rank === 1) rowStyle = 'bg-blue-500/5 border-l-4 border-[#3D719D]';
                        else if (rank === 2) rowStyle = 'bg-orange-500/5 border-l-4 border-[#C68E63]';

                        return (
                            <div key={idx} className={cn(
                                "grid grid-cols-12 items-center p-3 rounded-r-lg transition-colors border-b border-border/10",
                                rowStyle
                            )}>
                                {type === 'sdr' ? (
                                    <>
                                        <div className="col-span-2 font-medium text-foreground text-sm truncate" title={item.name}>
                                            {item.name}
                                        </div>
                                        <div className="col-span-1 text-center font-bold text-foreground text-xs">
                                            {item.total}
                                        </div>
                                        <div className="col-span-1 text-center font-bold text-emerald-500 text-xs">
                                            {item.Realizado}
                                        </div>
                                        <div className="col-span-1 text-center text-red-500 text-xs">
                                            {item.Cancelado}
                                        </div>
                                        <div className="col-span-1 text-center text-violet-400 text-xs">
                                            {item.Esquecimento}
                                        </div>
                                        <div className="col-span-1 text-center text-rose-400 text-xs">
                                            {item['No-show']}
                                        </div>
                                        <div className="col-span-1 text-center text-blue-400 text-xs">
                                            {item.Reagendado}
                                        </div>
                                        <div className="col-span-1 text-center text-blue-400 text-xs font-medium">
                                            {item.ligacao}
                                        </div>
                                        <div className="col-span-2 text-center text-orange-400 text-xs font-medium">
                                            {item.reagendamento}
                                        </div>
                                        <div className="col-span-1 text-center text-purple-400 text-xs font-medium">
                                            {item.upgrade}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="col-span-3 font-medium text-foreground text-sm truncate" title={item.name}>
                                            {item.name}
                                        </div>
                                        <div className="col-span-2 text-center font-bold text-foreground text-xs">
                                            {item.total}
                                        </div>
                                        <div className="col-span-1 text-center font-bold text-emerald-500 text-xs">
                                            {item.Realizado}
                                        </div>
                                        <div className="col-span-1 text-center text-red-500 text-xs">
                                            {item.Cancelado}
                                        </div>
                                        <div className="col-span-2 text-center text-violet-400 text-xs">
                                            {item.Esquecimento}
                                        </div>
                                        <div className="col-span-1 text-center text-rose-400 text-xs">
                                            {item['No-show']}
                                        </div>
                                        <div className="col-span-2 text-center text-blue-400 text-xs">
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
