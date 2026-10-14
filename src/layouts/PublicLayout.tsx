import React from 'react';
import { CustomPublicLogo } from '../components/CustomPublicLogo';

interface PublicLayoutProps {
    children: React.ReactNode;
}

// Página pública sempre no tema claro (o aluno não tem o seletor de tema).
// No celular o conteúdo fica no topo (centralizar empurra o formulário para
// baixo e briga com o teclado); a partir de sm, centralizado.
// Cada página desenha o próprio cartão e escolhe a largura (o agendamento usa
// três colunas no desktop; os avisos, uma caixa estreita).
export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
    return (
        <div
            className="min-h-dvh bg-background flex flex-col items-center justify-start sm:justify-center px-4 py-6 sm:p-6 light"
            style={{ backgroundColor: '#fff', color: '#0f172a', colorScheme: 'light' }}
        >
            <div className="w-full max-w-5xl space-y-6 sm:space-y-8">
                <div className="flex justify-center sm:mt-4">
                    <CustomPublicLogo className="w-40 sm:w-52 h-auto text-[#0f172a]" />
                </div>

                <main>{children}</main>

                <footer className="text-center text-xs sm:text-sm text-muted-foreground pb-2">
                    &copy; {new Date().getFullYear()} TradeStars. Todos os direitos reservados.
                </footer>
            </div>
        </div>
    );
};
