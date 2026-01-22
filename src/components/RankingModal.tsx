import React from 'react';
import { Modal } from './ui/modal';

interface RankingModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: any[];
    type: 'sdr' | 'closer';
}

export const RankingModal: React.FC<RankingModalProps> = ({ isOpen, onClose, title, data, type }) => {

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="max-h-[75vh] overflow-y-auto pr-2">
                <div className="bg-background rounded-lg border border-border overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-12 bg-background/50 p-3 text-[10px] font-bold text-secondary uppercase tracking-wider border-b border-border sticky top-0 bg-surface z-10">
                        <div className="col-span-2">Nome</div>
                        <div className="col-span-1 text-center">T. Rec.</div>
                        <div className="col-span-1 text-center text-emerald-500">Real.</div>
                        <div className="col-span-1 text-center text-red-500">Can.</div>
                        <div className="col-span-1 text-center text-violet-500">Esq.</div>
                        <div className="col-span-1 text-center text-rose-500">N.S</div>
                        <div className="col-span-1 text-center text-blue-500">Reag.</div>
                        {type === 'sdr' ? (
                            <>
                                <div className="col-span-1.5 text-center text-blue-400">Lig.</div>
                                <div className="col-span-1.5 text-center text-orange-400">R. Clo.</div>
                                <div className="col-span-1 text-center text-purple-400">Upgr.</div>
                            </>
                        ) : (
                            <div className="col-span-4" />
                        )}
                    </div>

                    {/* Body */}
                    <div className="divide-y divide-border">
                        {data.map((item, idx) => {
                            // Style top 3
                            let rowStyle = "";
                            if (idx === 0) rowStyle = "bg-primary/5 border-l-4 border-l-yellow-500 shadow-sm"; // Gold
                            else if (idx === 1) rowStyle = "bg-primary/5 border-l-4 border-l-gray-400"; // Silver
                            else if (idx === 2) rowStyle = "bg-primary/5 border-l-4 border-l-amber-700"; // Bronze
                            else rowStyle = "hover:bg-background/50 border-l-4 border-l-transparent";

                            return (
                                <div key={idx} className={`grid grid-cols-12 items-center p-3 transition-colors ${rowStyle}`}>
                                    <div className="col-span-2 font-medium text-foreground text-xs truncate" title={item.name}>
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
                                    {type === 'sdr' ? (
                                        <>
                                            <div className="col-span-1.5 text-center text-blue-400 text-xs">
                                                {item.ligacao}
                                            </div>
                                            <div className="col-span-1.5 text-center text-orange-400 text-xs">
                                                {item.reagendamento}
                                            </div>
                                            <div className="col-span-1 text-center text-purple-400 text-xs">
                                                {item.upgrade}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="col-span-4" />
                                    )}
                                </div>
                            );
                        })}
                        {data.length === 0 && (
                            <div className="p-4 text-center text-secondary">Sem dados para exibir.</div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
