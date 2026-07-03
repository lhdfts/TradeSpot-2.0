import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

interface AuthContextType {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
    hasPermission: (requiredRoles: User['role'][]) => boolean;
    verifyRoleIntegrity: () => Promise<boolean>;
    authError: string | null;
    clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);



export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [roleIntegrityHash, setRoleIntegrityHash] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    const clearAuthError = () => {
        setAuthError(null);
    };

    // Initial load & Listener
    useEffect(() => {
        const checkSession = async () => {
            try {
                // First hit the API to see if the session cookie is valid
                const response = await fetch('/api/me');
                if (response.ok) {
                    const userData = await response.json();
                    setUser({
                        id: userData.id,
                        firebase_id: userData.uid,
                        name: userData.name,
                        email: userData.email,
                        role: userData.role,
                        sector: userData.sector
                    });
                    // VULN-007: Store server-signed integrity hash
                    if (userData._integrity) {
                        setRoleIntegrityHash(userData._integrity);
                    }
                }
            } catch (e) {
                // Ignore, user is not logged in via cookie
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser?.email) {
                const token = await firebaseUser.getIdToken();
                // Send the ID token to our backend to create a session cookie
                try {
                    const res = await fetch('/api/auth/sessionLogin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idToken: token })
                    });
                    
                    if (res.ok) {
                        // Cookie is set! Now fetch user data
                        await fetchUser(firebaseUser.uid);
                    } else {
                        throw new Error('Falha ao criar sessão segura no backend');
                    }
                } catch (err) {
                    console.error('Session login error:', err);
                    await logout();
                }
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchUser = async (firebaseUid: string) => {
        try {
            setLoading(true);
            setAuthError(null);

            console.log("Tentando validar sessão no servidor via Cookie...");
            
            // NO Authorization header! It uses the HttpOnly cookie implicitly.
            const response = await fetch('/api/me');

            // Se a resposta não for OK, vamos ler o erro do servidor
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Erro do Servidor (${response.status}):`, errorText);
                
                // Se o erro for 401 ou 403, e o usuário já está autenticado no Firebase,
                // significa que ele não está no banco de dados
                if (response.status === 401 || response.status === 403) {
                    setAuthError("Credenciais validadas, mas o usuário não foi encontrado, abra um chamado ou entre em contato com sua liderança solicitando a liberação do acesso");
                    await logout();
                }
                
                throw new Error(`Servidor negou acesso: ${response.status}`);
            }

            const userData = await response.json();
            console.log("Usuário validado com sucesso!", userData);

            setUser({
                id: userData.id,
                firebase_id: firebaseUid,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                sector: userData.sector
            });
            // VULN-007: Store server-signed integrity hash
            if (userData._integrity) {
                setRoleIntegrityHash(userData._integrity);
            }
        } catch (err) {
            console.error('FALHA NO LOGIN:', err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = (newUser: User) => {
        setUser(newUser);
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/sessionLogout', { method: 'POST' });
        } catch (e) {
            console.error('Failed to logout from server', e);
        }
        await firebaseSignOut(auth);
        setUser(null);
        setRoleIntegrityHash(null);
    };

    /**
     * VULN-007 Fix: Verify the stored role integrity hash against the server.
     * If the hash doesn't match (tampering detected), force logout.
     * Returns true if the role is valid, false if tampered.
     */
    const verifyRoleIntegrity = async (): Promise<boolean> => {
        if (!roleIntegrityHash) return false;

        try {
            const response = await fetch('/api/verify-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ _integrity: roleIntegrityHash })
            });

            if (!response.ok) return false;

            const { valid } = await response.json();
            if (!valid) {
                console.error('[SECURITY] Role integrity verification failed. Possible tampering detected. Forcing logout.');
                await logout();
                return false;
            }
            return true;
        } catch (err) {
            console.error('Role verification error:', err);
            return false;
        }
    };

    const hasPermission = (requiredRoles: User['role'][]) => {
        if (!user) return false;
        if (user.role === 'Dev') return true;
        if (requiredRoles.length === 0) return true;
        return requiredRoles.includes(user.role);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, hasPermission, verifyRoleIntegrity, authError, clearAuthError }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
