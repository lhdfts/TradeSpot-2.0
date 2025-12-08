
import { supabase } from '../lib/supabase';
import type { ApiService } from './api';
import type { Appointment, Attendant, Event } from '../types';

export class SupabaseApiService implements ApiService {
    appointments = {
        list: async (): Promise<Appointment[]> => {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    clients (
                        name,
                        phone,
                        email,
                        interest_level,
                        knowledge_level,
                        financial_currency,
                        financial_amount
                    )
                `);

            if (error) throw new Error(error.message);

            return data.map((app: any) => ({
                id: app.id,
                lead: app.clients?.name || 'Unknown',
                phone: app.clients?.phone || '',
                email: app.clients?.email,
                date: app.date,
                time: app.time.slice(0, 5), // Format HH:MM:SS to HH:MM
                type: app.type,
                status: app.status,
                attendantId: app.attendant_id,
                eventId: app.event_id,
                meetLink: app.meet_link,
                notes: app.notes,
                additionalInfo: app.additional_info,
                createdBy: app.created_by,
                studentProfile: app.clients ? {
                    interest: app.clients.interest_level,
                    knowledge: app.clients.knowledge_level,
                    financial: {
                        currency: app.clients.financial_currency,
                        amount: app.clients.financial_amount
                    }
                } : undefined
            }));
        },
        create: async (data: Omit<Appointment, 'id'>): Promise<Appointment> => {
            // 1. Create or find client
            // For simplicity, we'll assume we create a new client for each appointment for now,
            // or we would need a way to select existing clients.
            // This part is tricky without changing the UI to select clients.
            // We will create a new client based on the lead info.

            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .insert({
                    name: data.lead,
                    phone: data.phone,
                    email: data.email,
                    interest_level: data.studentProfile?.interest,
                    knowledge_level: data.studentProfile?.knowledge,
                    financial_currency: data.studentProfile?.financial.currency,
                    financial_amount: data.studentProfile?.financial.amount
                })
                .select()
                .single();

            if (clientError) throw new Error(clientError.message);

            // 2. Create appointment
            const { data: appData, error: appError } = await supabase
                .from('appointments')
                .insert({
                    client_id: clientData.id,
                    attendant_id: data.attendantId,
                    event_id: data.eventId,
                    date: data.date,
                    time: data.time,
                    type: data.type,
                    status: data.status,
                    meet_link: data.meetLink,
                    notes: data.notes,
                    additional_info: data.additionalInfo,
                    created_by: data.createdBy
                })
                .select()
                .single();

            if (appError) throw new Error(appError.message);

            return {
                ...data,
                id: appData.id
            };
        },
        update: async (id: string | number, data: Partial<Appointment>): Promise<Appointment> => {
            const updateData: any = {};
            if (data.date) updateData.date = data.date;
            if (data.time) updateData.time = data.time;
            if (data.type) updateData.type = data.type;
            if (data.status) updateData.status = data.status;
            if (data.attendantId) updateData.attendant_id = data.attendantId;
            if (data.eventId) updateData.event_id = data.eventId;
            if (data.meetLink) updateData.meet_link = data.meetLink;
            if (data.notes) updateData.notes = data.notes;
            if (data.additionalInfo) updateData.additional_info = data.additionalInfo;

            const { data: appData, error } = await supabase
                .from('appointments')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw new Error(error.message);

            // If client info changed, update client
            // This requires fetching the client_id first or assuming it's passed.
            // For now, we only update appointment fields.

            return {
                ...data,
                id: appData.id
            } as Appointment;
        }
    };

    attendants = {
        list: async (): Promise<Attendant[]> => {
            const { data, error } = await supabase
                .from('users')
                .select('*');

            if (error) throw new Error(error.message);

            return data.map((user: any) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                sector: user.sector, // Assuming sector matches or needs mapping
                schedule: user.schedule,
                pauses: user.pauses
            }));
        },
        create: async (): Promise<Attendant> => {
            // Creating a user in Supabase usually requires Auth signup.
            // We will insert into public.users, but ideally this should be handled via Auth.
            // For this demo, we'll assume we can insert directly if RLS allows or we use a function.
            // However, public.users references auth.users.
            // We cannot easily create a user here without creating an auth user.
            // We will throw an error for now or mock it.
            throw new Error("Creating attendants via API is restricted. Please use Supabase Auth.");
        },
        update: async (id: string, data: Partial<Attendant>): Promise<Attendant> => {
            const updateData: any = {};
            if (data.name) updateData.name = data.name;
            if (data.schedule) updateData.schedule = data.schedule;
            if (data.pauses) updateData.pauses = data.pauses;

            const { data: userData, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw new Error(error.message);

            return {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                sector: userData.sector,
                schedule: userData.schedule,
                pauses: userData.pauses
            };
        },
        delete: async (): Promise<void> => {
            // Deleting a user is also sensitive.
            throw new Error("Deleting attendants via API is restricted.");
        }
    };

    events = {
        list: async (): Promise<Event[]> => {
            const { data, error } = await supabase
                .from('events')
                .select('*');

            if (error) throw new Error(error.message);

            return data.map((event: any) => ({
                id: event.id,
                event_name: event.event_name,
                start_date: event.start_date,
                end_date: event.end_date,
                status: event.status,
                created_at: event.created_at
            }));
        },
        create: async (data: Omit<Event, 'id'>): Promise<Event> => {
            const { data: eventData, error } = await supabase
                .from('events')
                .insert({
                    event_name: data.event_name,
                    start_date: data.start_date,
                    end_date: data.end_date,
                    status: data.status
                })
                .select()
                .single();

            if (error) throw new Error(error.message);

            return {
                id: eventData.id,
                event_name: eventData.event_name,
                start_date: eventData.start_date,
                end_date: eventData.end_date,
                status: eventData.status
            };
        },
        update: async (id: string, data: Partial<Event>): Promise<Event> => {
            const { data: eventData, error } = await supabase
                .from('events')
                .update({
                    event_name: data.event_name,
                    start_date: data.start_date,
                    end_date: data.end_date,
                    status: data.status
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw new Error(error.message);

            return {
                id: eventData.id,
                event_name: eventData.event_name,
                start_date: eventData.start_date,
                end_date: eventData.end_date,
                status: eventData.status
            };
        },
        delete: async (id: string): Promise<void> => {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', id);

            if (error) throw new Error(error.message);
        }
    };
}
