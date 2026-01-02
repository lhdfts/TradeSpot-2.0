import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { supabase } from '../lib/supabase';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

interface AuthContextType {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
    hasPermission: (requiredRoles: User['role'][]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);



export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Initial load & Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser?.email) {
                await fetchUser(firebaseUser.email, firebaseUser.uid);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchUser = async (email: string, firebaseUid: string) => {
        try {
            const { data: userData, error } = await supabase
                .from('user')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (error || !userData) {
                console.error('User not found in public.user table:', error);
                setUser(null);
            } else {
                // Update Firebase UID in Supabase if missing (Optional synchronization)
                if (!userData.firebase_id) {
                    try {
                        const { error: updateError } = await supabase.from('user').update({ firebase_id: firebaseUid }).eq('id', userData.id);
                        if (updateError) {
                            console.warn('Failed to sync firebase_id (likely RLS). Continuing...', updateError);
                        }
                    } catch (syncErr) {
                        console.warn('Failed to sync firebase_id (exception). Continuing...', syncErr);
                    }
                }

                setUser({
                    id: userData.id,
                    firebase_id: firebaseUid,
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    sector: userData.sector
                });
            }
        } catch (err) {
            console.error('Error fetching user details:', err);
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
        <AuthContext.Provider value={{ user, login, logout, hasPermission }}>
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
