import React, { useEffect } from 'react';
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
    // Se o <html> chegou com a classe "dark" (navegação vinda do sistema interno),
    // tira enquanto a página pública estiver aberta: assim os tokens (bg-muted,
    // text-muted-foreground, primary...) ficam nos valores claros.
    useEffect(() => {
        const root = document.documentElement;
        const hadDark = root.classList.contains('dark');
        root.classList.remove('dark');
        return () => {
            if (hadDark) root.classList.add('dark');
        };
    }, []);

    return (
        <div
            className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-start sm:justify-center px-4 py-6 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            style={{ colorScheme: 'light' }}
        >
            <div className="w-full max-w-5xl space-y-6 sm:space-y-8">
                <div className="flex justify-center sm:mt-4">
                    <CustomPublicLogo className="w-40 sm:w-52 h-auto text-foreground" />
                </div>

                <main>{children}</main>

                <footer className="text-center text-xs sm:text-sm text-muted-foreground pb-2 space-y-1">
                    <p>Dúvidas sobre seus dados? Fale com quem te enviou este link.</p>
                    <p>&copy; {new Date().getFullYear()} TradeStars. Todos os direitos reservados.</p>
                </footer>
            </div>
        </div>
    );
};
