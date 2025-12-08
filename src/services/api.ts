import type { Appointment, Attendant, Event } from '../types';

// Mock data removed as we are now using Supabase

export interface ApiService {
    appointments: {
        list: () => Promise<Appointment[]>;
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
        create: (data: Omit<Event, 'id'>) => Promise<Event>;
        update: (id: string, data: Partial<Event>) => Promise<Event>;
        delete: (id: string) => Promise<void>;
    };
}

import { SupabaseApiService } from './supabaseApi';

export const api = new SupabaseApiService();
