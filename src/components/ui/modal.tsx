import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from "../../lib/utils";


interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidthClass = 'max-w-2xl' }) => {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={handleBackdropClick}>
            {/* max-h-full: limita à área do overlay (fixed inset-0 acompanha as barras do navegador no celular).
                A partir de sm, 90dvh; sem suporte a dvh a regra é descartada e vale o max-h-full. */}
            <div className={cn("w-full max-h-full sm:max-h-[90dvh] min-h-0 flex flex-col bg-surface border border-gray-700 rounded-xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out overflow-hidden", maxWidthClass)}>
                <div className="flex items-center justify-between gap-3 px-4 py-3 sm:p-4 border-b border-gray-700 shrink-0 bg-[#070707] rounded-t-xl">
                    <h2 className="min-w-0 break-words text-base sm:text-lg font-semibold text-white">{title}</h2>
                    {/* Margem negativa: área de toque maior sem mudar a altura do cabeçalho */}
                    <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 -m-2 p-2 text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                {/* min-h-0: o corpo encolhe dentro da coluna e rola, mantendo o cabeçalho visível */}
                <div className="min-h-0 p-4 sm:p-6 overflow-y-auto overscroll-contain">
                    {children}
                </div>
            </div>
        </div>
    );
};
