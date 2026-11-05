import { RefreshCw } from 'lucide-react';
import { useVersionChecker } from '../hooks/useVersionChecker';
import { Button } from './ui/button';

export function UpdateNotification() {
    const { updateAvailable, reload } = useVersionChecker();

    if (!updateAvailable) return null;

    return (
        // Faixa fixa só para centralizar; o aviso em si é que recebe cliques.
        // safe-area: no iPhone o aviso não fica atrás da barra de gestos.
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-[9999] flex justify-center px-4">
            <div
                role="status"
                className="pointer-events-auto flex max-w-full items-center gap-3 rounded-xl border border-border bg-popover py-3 pl-5 pr-3 text-sm text-popover-foreground shadow-xl animate-fade-up"
            >
                {/* Em telas estreitas o texto quebra em vez de o aviso vazar da tela */}
                <span className="min-w-0 text-muted-foreground">Nova versão disponível</span>
                <Button size="sm" onClick={reload} className="shrink-0 gap-1.5">
                    <RefreshCw size={14} aria-hidden />
                    Atualizar
                </Button>
            </div>
        </div>
    );
}
