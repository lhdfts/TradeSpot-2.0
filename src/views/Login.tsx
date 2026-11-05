import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { auth } from '../lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, SAMLAuthProvider } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { marcarAberturaPendente, limparAberturaPendente } from '../components/abertura/controleAbertura';
import { ESTRELA_SPOT } from '../components/abertura/estrela';

// Códigos do Firebase Auth em mensagens que dizem o que fazer. A mensagem
// técnica do erro (error.message) nunca vai para a tela, só para o console.
function mensagemDeErro(error: unknown): string {
    const code = (error as { code?: string } | null)?.code;
    switch (code) {
        case 'auth/popup-blocked':
            return 'O navegador bloqueou a janela de login. Permita pop-ups para este site ou entre por redirecionamento.';
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
        case 'auth/user-cancelled':
            return 'A janela de login foi fechada antes de terminar. Tente de novo.';
        case 'auth/network-request-failed':
            return 'Sem conexão com o servidor de login. Confira sua internet e tente de novo.';
        case 'auth/unauthorized-domain':
        case 'auth/operation-not-allowed':
        case 'auth/unauthorized-continue-uri':
            return 'Este endereço não está autorizado a fazer login. Avise o suporte.';
        default:
            return 'Não foi possível entrar. Tente de novo.';
    }
}

export const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [erroLogin, setErroLogin] = useState<string | null>(null);
    const { authError, clearAuthError } = useAuth();
    // Recusa do sistema (ex.: e-mail sem cadastro) tem prioridade sobre erro do provedor.
    const erro = authError ?? erroLogin;

    // Login recusado pelo sistema (ex.: e-mail sem cadastro): sem vinheta.
    React.useEffect(() => {
        if (authError) limparAberturaPendente();
    }, [authError]);

    React.useEffect(() => {
        getRedirectResult(auth).catch((error) => {
            limparAberturaPendente();
            console.error('Error from redirect login:', error);
            setErroLogin(mensagemDeErro(error));
        });
    }, []);

    const handleGoogleLogin = async (method: 'popup' | 'redirect') => {
        // Antes do primeiro await: o som da vinheta só pode ser criado dentro do clique.
        marcarAberturaPendente();
        setLoading(true);
        setErroLogin(null);
        clearAuthError();
        const provider = new SAMLAuthProvider(
            "saml.sistema-depositos-google-workspace"
        );

        const falhou = (error: unknown) => {
            limparAberturaPendente();
            setErroLogin(mensagemDeErro(error));
            setLoading(false);
        };

        try {
            if (method === 'popup') {
                await signInWithPopup(auth, provider);
            } else {
                await signInWithRedirect(auth, provider);
            }
            // AuthContext will handle state change
        } catch (error: unknown) {
            console.warn(`${method} login failed...`, error);
            const code = (error as { code?: string } | null)?.code;

            // Pop-up bloqueado ou sem armazenamento: tenta o redirecionamento sozinho.
            // Fechar a janela foi escolha do usuário: só avisa.
            if (method === 'popup' && (code === 'auth/popup-blocked' || code === 'auth/web-storage-unsupported')) {
                try {
                    await signInWithRedirect(auth, provider);
                } catch (redirectError: unknown) {
                    console.error('Error starting redirect login:', redirectError);
                    falhou(redirectError);
                }
            } else {
                console.error('Error logging in with Google:', error);
                falhou(error);
            }
        }
    };

    return (
        <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 animate-fade-up">
                <div className="flex flex-col items-center justify-center">
                    {/* A estrela do logo ganha um brilho lento, eco da vinheta de abertura.
                        Fica por cima da estrela do próprio logo, nas mesmas medidas. */}
                    <div className="relative">
                        <Logo className="h-12 w-auto text-foreground" />
                        <svg
                            viewBox="0 0 1114 208"
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-foreground animate-estrela-brilho"
                        >
                            <path d={ESTRELA_SPOT} fill="currentColor" />
                        </svg>
                    </div>
                </div>

                <div className="mt-8 space-y-6">
                    {erro && (
                        <div role="alert" className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg">
                            <p className="text-sm">{erro}</p>
                        </div>
                    )}
                    <div className="text-center">
                        <h2 className="mt-6 text-3xl font-bold text-foreground">
                            Bem-vindo de volta
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Faça login para acessar sua conta
                        </p>
                    </div>

                    <div className="mt-8 flex flex-col items-center justify-center gap-4">
                        <button
                            onClick={() => handleGoogleLogin('popup')}
                            disabled={loading}
                            type="button"
                            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface px-8 py-4 text-sm font-medium text-foreground shadow-sm hover:bg-accent disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                            {loading ? (
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
                            ) : (
                                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                            )}
                            <span>{loading ? 'Entrando…' : 'Entrar com Google'}</span>
                        </button>

                        {/* Alternativa discreta para quando o pop-up abre em branco. */}
                        <button
                            onClick={() => handleGoogleLogin('redirect')}
                            disabled={loading}
                            type="button"
                            className="rounded-md px-2 py-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            A tela ficou em branco? Entrar por redirecionamento
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
