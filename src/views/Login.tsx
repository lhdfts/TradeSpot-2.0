import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { auth } from '../lib/firebase';
import { signInWithPopup, SAMLAuthProvider } from 'firebase/auth';

export const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        const provider = new SAMLAuthProvider(
            "saml.sistema-depositos-google-workspace"
        );
        console.log("Firebase Config:", {
            apiKey: auth.app.options.apiKey ? '***' : 'MISSING',
            authDomain: auth.app.options.authDomain,
            projectId: auth.app.options.projectId
        });
        try {
            await signInWithPopup(auth, provider);
            // AuthContext will handle state change
        } catch (error) {
            console.error('Error logging in with Google:', error);
            alert(`Erro ao fazer login com Google: ${(error as any).message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center justify-center">
                    <Logo className="h-12 w-auto text-primary" />
                </div>

                <div className="mt-8 space-y-6">
                    <div className="text-center">
                        <h2 className="mt-6 text-3xl font-extrabold text-foreground">
                            Bem-vindo de volta
                        </h2>
                        <p className="mt-2 text-sm text-secondary">
                            Faça login para acessar sua conta
                        </p>
                    </div>

                    <div className="mt-8 flex justify-center">
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            type="button"
                            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface px-8 py-4 text-sm font-medium text-foreground shadow-sm hover:bg-white/5 disabled:opacity-50 transition-colors"
                        >
                            {loading ? (
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            ) : (
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
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
                            <span>Entrar com Google</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
