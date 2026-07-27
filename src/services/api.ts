import type { Appointment, Attendant, Event, UnnichatConnection } from '../types';

// Mock data removed as we are now using Supabase

export interface ApiService {
    appointments: {
        list: (params?: { startDate?: string; endDate?: string }) => Promise<Appointment[]>;
        create: (data: Omit<Appointment, 'id'>) => Promise<Appointment>;
        update: (id: string | number, data: Partial<Appointment>) => Promise<Appointment>;
    };
    attendants: {
        list: () => Promise<Attendant[]>;
        create: (data: Omit<Attendant, 'id'>) => Promise<Attendant>;
        update: (id: string, data: Partial<Attendant>) => Promise<Attendant>;
        delete: (id: string) => Promise<void>;
    };
    events: {
        list: () => Promise<Event[]>;
        listFeeds: (sector: string) => Promise<Event[]>;
        create: (data: Omit<Event, 'id'>) => Promise<Event>;
        update: (id: string, data: Partial<Event>) => Promise<Event>;
        delete: (id: string) => Promise<void>;
    };
    unnichatConnections: {
        list: () => Promise<UnnichatConnection[]>;
        create: (data: Omit<UnnichatConnection, 'id' | 'created_at'>) => Promise<UnnichatConnection>;
        update: (id: string | number, data: Partial<UnnichatConnection>) => Promise<UnnichatConnection>;
        delete: (id: string | number) => Promise<void>;
    };
    clients: {
        getByEmail: (email: string) => Promise<any | null>;
        getByPhone: (phone: string | number) => Promise<any | null>;
    };
}

import { SupabaseApiService } from './supabaseApi';

export const api = new SupabaseApiService();
