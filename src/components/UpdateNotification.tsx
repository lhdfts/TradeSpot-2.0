import { RefreshCw } from 'lucide-react';
import { useVersionChecker } from '../hooks/useVersionChecker';

export function UpdateNotification() {
    const { updateAvailable, reload } = useVersionChecker();

    if (!updateAvailable) return null;

    return (
        <div
            style={{
                position: 'fixed',
                // safe-area: no iPhone o aviso não fica atrás da barra de gestos
                bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                // Em telas estreitas o texto quebra em vez de o aviso vazar da tela
                maxWidth: 'calc(100vw - 32px)',
                width: 'max-content',
                backgroundColor: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '12px 20px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'Montserrat, sans-serif',
                animation: 'slideUp 0.3s ease-out',
            }}
        >
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>

            <span style={{ color: '#a0a0b8', minWidth: 0 }}>
                🚀 Nova versão disponível
            </span>

            <button
                onClick={reload}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#4338ca')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4f46e5')}
            >
                <RefreshCw size={14} />
                Atualizar
            </button>
        </div>
    );
}
