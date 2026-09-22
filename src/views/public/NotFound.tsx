import React from 'react';
import { AlertCircle } from 'lucide-react';

export const NotFound: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center p-12 space-y-6 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-bold">Página não encontrada</h1>
                <p className="text-muted-foreground max-w-xs mx-auto">
                    O link que você está tentando acessar não existe ou pode ter sido alterado.
                </p>
            </div>
            {/* Optional: Add a button if we want to direct them somewhere, but for strict security/dead-end, just text is fine. 
                User asked for "aviso de 'essa página não existe'". */}
        </div>
    );
};
