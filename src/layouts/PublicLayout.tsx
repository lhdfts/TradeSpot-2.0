import React from 'react';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';

interface PublicLayoutProps {
    children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <header className="absolute top-4 right-4">
                <ThemeToggle />
            </header>

            <div className="w-full max-w-md space-y-8">
                <div className="flex justify-center mb-8">
                    <Logo />
                </div>

                <main className="bg-card rounded-lg shadow-lg overflow-hidden border border-border">
                    {children}
                </main>

                <footer className="text-center text-sm text-muted-foreground mt-8">
                    &copy; {new Date().getFullYear()} TradeSpot. Todos os direitos reservados.
                </footer>
            </div>
        </div>
    );
};
