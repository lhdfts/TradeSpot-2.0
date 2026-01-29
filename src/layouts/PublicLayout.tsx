import React from 'react';
import { CustomPublicLogo } from '../components/CustomPublicLogo';

interface PublicLayoutProps {
    children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 light" style={{ backgroundColor: '#fff', color: '#0f172a' }}>
            <div className="w-full max-w-md space-y-8">
                <div className="flex justify-center mb-8">
                    <CustomPublicLogo className="w-52 h-auto text-[#0f172a]" />
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
