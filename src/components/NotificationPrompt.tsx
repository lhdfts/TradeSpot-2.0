// Pede permissão de notificação com um clique do usuário (o Firefox e o Safari
// só mostram o pedido nesse caso, e o Chrome esconde pedidos automáticos).
// Aparece já no primeiro render, então não empurra a página depois de montada.

import { useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { Button } from './ui/button';

const DISMISS_KEY = 'tradespot:aviso-notificacoes-dispensado';

const supported = typeof window !== 'undefined' && 'Notification' in window;

function wasDismissed() {
    try {
        return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
        return false;
    }
}

export function NotificationPrompt() {
    const [visible, setVisible] = useState(() => supported && Notification.permission === 'default' && !wasDismissed());

    if (!visible) return null;

    const enable = async () => {
        await Notification.requestPermission();
        setVisible(false);
    };

    const dismiss = () => {
        try {
            localStorage.setItem(DISMISS_KEY, '1');
        } catch {
            // sem localStorage o aviso volta na próxima visita
        }
        setVisible(false);
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-primary/30 bg-primary/5" role="region" aria-label="Ativar notificações">
            <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="size-9 shrink-0 grid place-items-center rounded-lg bg-primary text-primary-foreground">
                    <BellRing size={18} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Receba um aviso 5 minutos antes dos seus agendamentos</p>
                    <p className="text-xs text-secondary mt-0.5">
                        O navegador mostra a notificação enquanto o sistema estiver aberto, mesmo em outra aba.
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 sm:shrink-0">
                <Button size="sm" onClick={enable}>Ativar notificações</Button>
                <Button size="sm" variant="ghost" onClick={dismiss} className="text-secondary" aria-label="Agora não">
                    <X size={16} className="sm:mr-1" />
                    <span className="hidden sm:inline">Agora não</span>
                </Button>
            </div>
        </div>
    );
}
