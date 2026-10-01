import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Appointment } from '../types';
import { api } from '../services/api';

interface AppointmentContextType {
    appointments: Appointment[];
    loading: boolean;
    refresh: (params?: { startDate?: string; endDate?: string }) => Promise<void>;
    createAppointment: (data: Omit<Appointment, 'id'>) => Promise<void>;
    updateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
    changeOwner: (id: string, ownerId: string) => Promise<void>;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export const AppointmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = async (params?: { startDate?: string; endDate?: string }) => {
        setLoading(true);
        try {
            const data = await api.appointments.list(params);
            setAppointments(data);
        } catch (error) {
            console.error('Failed to fetch appointments', error);
        } finally {
            setLoading(false);
        }
    };

    const createAppointment = async (data: Omit<Appointment, 'id'>) => {
        await api.appointments.create(data);
        await refresh();
    };

    const updateAppointment = async (id: string, data: Partial<Appointment>) => {
        await api.appointments.update(id, data);
        await refresh();
    };

    // Atualiza só a linha alterada, sem refazer a busca (que perderia o filtro de datas da tela).
    const changeOwner = async (id: string, ownerId: string) => {
        const result = await api.appointments.changeOwner(id, ownerId);
        setAppointments(prev => prev.map(a => a.id === id
            ? { ...a, ownerId: result.ownerId, ownerName: result.ownerName, ownerChangedAt: result.ownerChangedAt }
            : a));
    };

    useEffect(() => {
        refresh();
    }, []);

    return (
        <AppointmentContext.Provider value={{ appointments, loading, refresh, createAppointment, updateAppointment, changeOwner }}>
            {children}
        </AppointmentContext.Provider>
    );
};

export const useAppointments = () => {
    const context = useContext(AppointmentContext);
    if (!context) throw new Error('useAppointments must be used within an AppointmentProvider');
    return context;
};
