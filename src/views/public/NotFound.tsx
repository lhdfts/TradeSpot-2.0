import React from 'react';
import { BrandStar } from './booking/BrandStar';

// /agendar sem link ou com caminho inválido. Sem botão de saída de propósito:
// a página pública não leva a lugar nenhum além do próprio link.
export const NotFound: React.FC = () => {
    return (
        <div className="w-full max-w-md mx-auto bg-card rounded-xl border border-border flex flex-col items-center justify-center p-8 sm:p-12 space-y-5 text-center animate-blur-fade">
            <BrandStar className="size-10 text-muted-foreground/40" />
            <div className="space-y-2">
                <h1 className="text-xl font-bold text-balance">Este link não está disponível</h1>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto text-pretty">
                    Confira se o endereço está completo ou peça um novo link de agendamento a quem te enviou.
                </p>
            </div>
        </div>
    );
};
