import React from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import { X } from 'lucide-react';
import { cn } from "../../lib/utils";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidthClass?: string;
}

// Cliques em camadas que ficam por cima do modal (diálogo de confirmação, toasts)
// não contam como "clique fora": senão confirmar uma ação fecharia o modal junto.
const isPressOnOverlayLayer = (event: Event | undefined) => {
    const target = event?.target;
    return target instanceof Element && !!target.closest('[data-confirm-dialog], [data-slot="toast-viewport"]');
};

/**
 * Modal sobre o Dialog do Base UI: role="dialog", aria-modal, aria-labelledby no
 * título, foco preso dentro, Esc fecha, fundo inerte e foco devolvido ao gatilho.
 */
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidthClass = 'max-w-2xl' }) => {
    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(open, details) => {
                if (open) return;
                if (details.reason === 'outside-press' && isPressOnOverlayLayer(details.event as Event | undefined)) {
                    details.cancel();
                    return;
                }
                onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Backdrop
                    className={cn(
                        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
                        "transition-opacity duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
                        "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
                    )}
                />
                {/* fixed inset-0 acompanha as barras do navegador no celular */}
                <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
                    {/* max-h-full: limita à área do viewport. A partir de sm, 90dvh;
                        sem suporte a dvh a regra é descartada e vale o max-h-full. */}
                    <Dialog.Popup
                        className={cn(
                            "w-full max-h-full sm:max-h-[90dvh] min-h-0 flex flex-col bg-surface text-foreground border border-border rounded-xl shadow-2xl overflow-hidden outline-none",
                            // Entrada/saída: opacidade + leve deslocamento/escala. Movimento reduzido: só opacidade.
                            "transition-[opacity,transform] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
                            "data-[starting-style]:opacity-0 data-[starting-style]:translate-y-2 data-[starting-style]:scale-[0.98]",
                            "data-[ending-style]:opacity-0 data-[ending-style]:translate-y-2 data-[ending-style]:scale-[0.98]",
                            "motion-reduce:transition-opacity motion-reduce:data-[starting-style]:translate-y-0 motion-reduce:data-[starting-style]:scale-100 motion-reduce:data-[ending-style]:translate-y-0 motion-reduce:data-[ending-style]:scale-100",
                            maxWidthClass
                        )}
                    >
                        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:p-4 border-b border-border shrink-0 bg-surface">
                            <Dialog.Title className="min-w-0 break-words text-base sm:text-lg font-semibold text-foreground">
                                {title}
                            </Dialog.Title>
                            {/* Margem negativa: área de toque maior sem mudar a altura do cabeçalho */}
                            <Dialog.Close
                                aria-label="Fechar"
                                className="shrink-0 -m-2 p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <X size={20} aria-hidden="true" />
                            </Dialog.Close>
                        </div>
                        {/* min-h-0: o corpo encolhe dentro da coluna e rola, mantendo o cabeçalho visível */}
                        <div className="min-h-0 p-4 sm:p-6 overflow-y-auto overscroll-contain">
                            {children}
                        </div>
                    </Dialog.Popup>
                </Dialog.Viewport>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
