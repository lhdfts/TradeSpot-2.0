import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';

interface ProtectedRouteProps {
    allowedRoles?: User['role'][];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles = [] }) => {
    const { user, hasPermission } = useAuth();

    if (!user) {
        // Redirect to login if potentially not authenticated (though we default to logged in for now)
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !hasPermission(allowedRoles)) {
        // Redirect to home if user doesn't have permission
        // Ideally show an "Unauthorized" page or toast
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};
