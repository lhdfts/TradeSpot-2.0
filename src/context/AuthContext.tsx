import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

interface AuthContextType {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
    hasPermission: (requiredRoles: User['role'][]) => boolean;
    authError: string | null;
    clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);



export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    const clearAuthError = () => {
        setAuthError(null);
    };

    // Initial load & Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser?.email) {
                const token = await firebaseUser.getIdToken();
                await fetchUser(firebaseUser.uid, token);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchUser = async (firebaseUid: string, token: string) => {
    try {
        setLoading(true);
        setAuthError(null);
        
        if (!token) throw new Error('Token não gerado pelo Firebase');

        console.log("Tentando validar sessão no servidor...");
        
        const response = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Se a resposta não for OK, vamos ler o erro do servidor
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Erro do Servidor (${response.status}):`, errorText);
            
            // Se o erro for 401 ou 403, e o usuário já está autenticado no Firebase,
            // significa que ele não está no banco de dados
            if (response.status === 401 || response.status === 403) {
                setAuthError("Credenciais validadas, mas o usuário não foi encontrado, abra um chamado ou entre em contato com sua liderança solicitando a liberação do acesso");
                await firebaseSignOut(auth);
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
        await firebaseSignOut(auth);
        setUser(null);
    };

    const hasPermission = (requiredRoles: User['role'][]) => {
        if (!user) return false;
        if (user.role === 'Dev') return true;
        if (requiredRoles.length === 0) return true;
        return requiredRoles.includes(user.role);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, hasPermission, authError, clearAuthError }}>
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
