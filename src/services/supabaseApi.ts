
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
                        email
                    ),
                    attendant:user!attendant_id (
                        name
                    ),
                    updater:user!updatedBy (
                        name,
                        sector
                    )
                `);

            if (error) throw new Error(error.message);

            return data.map((app: any) => ({
                id: app.id,
                lead: app.clients?.name || 'Unknown',
                phone: app.clients?.phone || 0,
                email: app.clients?.email,
                date: app.date,
                time: app.time.slice(0, 5), // Format HH:MM:SS to HH:MM
                type: app.type,
                status: app.status,
                attendantId: app.attendant_id,
                attendantName: app.attendant?.name,
                eventId: app.event_id,
                meetLink: app.meet_link,
                notes: app.notes,
                additionalInfo: app.additional_info,
                createdBy: app.created_by,
                studentProfile: {
                    interest: app.interest_level,
                    knowledge: app.knowledge_level,
                    financial: {
                        currency: app.financial_currency,
                        amount: app.financial_amount
                    }
                },
                // Status tracking
                oldStatus: app.oldStatus,
                updatedBy: app.updatedBy,
                updater: app.updater
            }));
        },
        create: async (data: Omit<Appointment, 'id'>): Promise<Appointment> => {
            // New Secure Flow (Spec 2.B): Send to Node.js Backend for Validation & Creation
            // Backend URL - uses local proxy or Vercel function
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Backend Error:", errorData);
                throw new Error(errorData.error || 'Failed to create appointment via backend');
            }

            const createdAppointment = await response.json();

            // Map Backend Response (Snake_case DB columns) to Frontend Model (camelCase)
            return {
                id: createdAppointment.id,
                lead: createdAppointment.lead,
                phone: createdAppointment.phone,
                email: createdAppointment.email,
                date: createdAppointment.date,
                time: createdAppointment.time ? createdAppointment.time.slice(0, 5) : '',
                type: createdAppointment.type,
                status: createdAppointment.status,
                attendantId: createdAppointment.attendant_id,
                eventId: createdAppointment.event_id,
                meetLink: createdAppointment.meet_link,
                notes: createdAppointment.notes,
                additionalInfo: createdAppointment.additional_info,
                createdBy: createdAppointment.created_by,
                studentProfile: createdAppointment.student_profile || {
                    interest: createdAppointment.interest_level,
                    knowledge: createdAppointment.knowledge_level,
                    financial: {
                        currency: createdAppointment.financial_currency,
                        amount: createdAppointment.financial_amount
                    }
                }
            } as Appointment;
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

            // Update student profile fields if they exist in the update data
            if (data.studentProfile) {
                if (data.studentProfile.interest) updateData.interest_level = data.studentProfile.interest;
                if (data.studentProfile.knowledge) updateData.knowledge_level = data.studentProfile.knowledge;
                if (data.studentProfile.financial) {
                    if (data.studentProfile.financial.currency) updateData.financial_currency = data.studentProfile.financial.currency;
                    if (data.studentProfile.financial.amount) updateData.financial_amount = data.studentProfile.financial.amount;
                }
            }

            // Status tracking logic
            if (data.status) {
                let userId = data.updatedBy;

                // Fallback: Get current user from session if not provided
                if (!userId) {
                    const { data: { user } } = await supabase.auth.getUser();
                    userId = user?.id;
                }

                if (userId) {
                    updateData.updatedBy = userId;

                    // Fetch current status to set as oldStatus if not provided
                    const { data: currentApp } = await supabase
                        .from('appointments')
                        .select('status')
                        .eq('id', id)
                        .single();

                    if (currentApp && currentApp.status !== data.status) {
                        updateData.oldStatus = currentApp.status;
                    }
                }
            }

            const { data: appData, error } = await supabase
                .from('appointments')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw new Error(error.message);

            return {
                ...data,
                id: appData.id
            } as Appointment;
        }
    };

    attendants = {
        list: async (): Promise<Attendant[]> => {
            const { data, error } = await supabase
                .from('user')
                .select('*');

            if (error) throw new Error(error.message);

            return data.map((user: any) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role, // Map role
                sector: user.sector, // Map sector
                schedule: user.schedule,
                pauses: user.pauses
            }));
        },
        create: async (data: Omit<Attendant, 'id'>): Promise<Attendant> => {
            // Creating a user in Supabase usually requires Auth signup.
            // We will insert into public.users, but ideally this should be handled via Auth.
            // For this demo, we'll assume we can insert directly if RLS allows or we use a function.
            // However, public.users references auth.users.
            // We cannot easily create a user here without creating an auth user.
            // We will throw an error for now or mock it.
            console.log(data); // Use data to avoid unused var error
            throw new Error("Creating attendants via API is restricted. Please use Supabase Auth.");
        },
        update: async (id: string, data: Partial<Attendant>): Promise<Attendant> => {
            const updateData: any = {};
            if (data.name) updateData.name = data.name;
            if (data.schedule) updateData.schedule = data.schedule;
            if (data.pauses) updateData.pauses = data.pauses;

            const { data: userData, error } = await supabase
                .from('user')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw new Error(error.message);

            return {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                sector: userData.sector,
                schedule: userData.schedule,
                pauses: userData.pauses
            };
        },
        delete: async (id: string): Promise<void> => {
            // Deleting a user is also sensitive.
            console.log(id); // Use id to avoid unused var error
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

    clients = {
        getByEmail: async (email: string): Promise<any | null> => {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (error) {
                throw new Error(error.message);
            }

            return data;
        },
        getByPhone: async (phone: string | number): Promise<any | null> => {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('phone', phone)
                .maybeSingle();

            if (error) {
                throw new Error(error.message);
            }

            return data;
        }
    };
}
