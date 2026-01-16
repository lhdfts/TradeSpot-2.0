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
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                <div className="bg-background rounded-lg border border-border overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-12 bg-background/50 p-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-border sticky top-0">
                        <div className="col-span-6">Nome</div>
                        {type === 'sdr' ? (
                            <>
                                <div className="col-span-2 text-center">Marcados</div>
                                <div className="col-span-2 text-center" title="Ligação Closer">Lig. Closer</div>
                                <div className="col-span-2 text-center" title="Reagendamento Closer">Reag.</div>
                            </>
                        ) : (
                            <>
                                <div className="col-span-3 text-center">Realizados</div>
                                <div className="col-span-3 text-center">Total Recebido</div>
                            </>
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
                                    <div className="col-span-6 font-medium text-primary text-sm truncate" title={item.name}>
                                        {item.name}
                                    </div>

                                    {type === 'sdr' ? (
                                        <>
                                            <div className="col-span-2 text-center font-bold text-blue-400 text-sm">
                                                {item.marked}
                                            </div>
                                            <div className="col-span-2 text-center text-sm text-secondary">
                                                {item.scheduled}
                                            </div>
                                            <div className="col-span-2 text-center text-sm text-secondary">
                                                {item.rescheduled}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="col-span-3 text-center font-bold text-green-600 text-sm">
                                                {item.realized}
                                            </div>
                                            <div className="col-span-3 text-center font-medium text-green-300 text-sm">
                                                {item.total}
                                            </div>
                                        </>
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
