import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';

interface ProtectedRouteProps {
    allowedRoles?: User['role'][];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles = [] }) => {
    const { user, hasPermission, verifyRoleIntegrity } = useAuth();
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);

    // VULN-007 Fix: For role-restricted routes, verify integrity server-side
    // This prevents Burp Suite interception of /api/me from granting admin UI access
    const needsRoleVerification = allowedRoles.length > 0;

    useEffect(() => {
        if (!user || !needsRoleVerification) return;

        let cancelled = false;

        const verify = async () => {
            setVerifying(true);
            try {
                const isValid = await verifyRoleIntegrity();
                if (!cancelled) {
                    setVerified(isValid);
                }
            } catch {
                if (!cancelled) {
                    setVerified(false);
                }
            } finally {
                if (!cancelled) {
                    setVerifying(false);
                }
            }
        };

        verify();

        return () => { cancelled = true; };
    }, [user, needsRoleVerification, verifyRoleIntegrity]);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // For routes without role restrictions, render immediately
    if (!needsRoleVerification) {
        return <Outlet />;
    }

    // While verifying role integrity, show nothing (brief loading)
    if (verifying || !verified) {
        // If verification completed and failed, redirect
        if (!verifying && !verified) {
            return <Navigate to="/" replace />;
        }
        return null; // Brief loading state during verification
    }

    // After verification passed, check the role permission
    if (!hasPermission(allowedRoles)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

