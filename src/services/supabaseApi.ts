import { getAuthHeaders } from '../lib/firebase';
import type { ApiService } from './api';
import type { Appointment, Attendant, Event, UnnichatConnection } from '../types';

export class SupabaseApiService implements ApiService {
    appointments = {
        list: async (params?: { startDate?: string; endDate?: string }): Promise<Appointment[]> => {
            const authHeaders = await getAuthHeaders();
            let url = '/api/appointments';
            if (params?.startDate || params?.endDate) {
                const searchParams = new URLSearchParams();
                if (params.startDate) searchParams.append('startDate', params.startDate);
                if (params.endDate) searchParams.append('endDate', params.endDate);
                url += `?${searchParams.toString()}`;
            }
            const response = await fetch(url, {
                headers: authHeaders
            });

            if (!response.ok) {
                throw new Error('Failed to fetch appointments');
            }

            return await response.json();
        },
        create: async (data: Omit<Appointment, 'id'>): Promise<Appointment> => {
            // New Secure Flow (Spec 2.B): Send to Node.js Backend for Validation & Creation
            // Backend URL - uses local proxy or Vercel function
            const authHeaders = await getAuthHeaders();
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Backend Error:", errorData);
                // Throw object with response structure for local handling
                throw { response: { status: response.status, data: errorData } };
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
                        amount: createdAppointment.financial_amount != null ? String(createdAppointment.financial_amount) : undefined
                    }
                }
            } as Appointment;
        },
        update: async (id: string | number, data: Partial<Appointment>): Promise<Appointment> => {
            // New Secure Flow: Send to Node.js Backend for Update & Webhook Trigger
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`/api/appointments/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Backend Update Error:", errorData);
                throw { response: { status: response.status, data: errorData } };
            }

            const updatedAppointment = await response.json();

            // Map Backend Response (Snake_case DB columns) to Frontend Model (camelCase)
            return {
                id: updatedAppointment.id,

                lead: updatedAppointment.lead || data.lead, // DB has 'lead' column? Yes.
                phone: updatedAppointment.phone || data.phone,
                email: updatedAppointment.email || data.email,
                date: updatedAppointment.date,
                time: updatedAppointment.time ? updatedAppointment.time.slice(0, 5) : '',
                type: updatedAppointment.type,
                status: updatedAppointment.status,
                attendantId: updatedAppointment.attendant_id,
                eventId: updatedAppointment.event_id,
                meetLink: updatedAppointment.meet_link,
                notes: updatedAppointment.notes,
                additionalInfo: updatedAppointment.additional_info,
                createdBy: updatedAppointment.created_by,
                studentProfile: updatedAppointment.student_profile || {
                    interest: updatedAppointment.interest_level,
                    knowledge: updatedAppointment.knowledge_level,
                    financial: {
                        currency: updatedAppointment.financial_currency,
                        amount: updatedAppointment.financial_amount != null ? String(updatedAppointment.financial_amount) : undefined
                    }
                }
            } as Appointment;
        }
    };

    attendants = {
        list: async (): Promise<Attendant[]> => {
            const authHeaders = await getAuthHeaders();
            const response = await fetch('/api/appointments/attendants', {
                headers: authHeaders
            });

            if (!response.ok) {
                console.error('Failed to fetch attendants');
                return [];
            }

            return await response.json();
        },
        create: async (data: Omit<Attendant, 'id'>): Promise<Attendant> => {
            const authHeaders = await getAuthHeaders();
            const response = await fetch('/api/appointments/attendants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to create attendant');
            }

            return await response.json();
        },
        update: async (id: string, data: Partial<Attendant>): Promise<Attendant> => {
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`/api/appointments/attendants/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update attendant');
            }

            return await response.json();
        },
        delete: async (id: string): Promise<void> => {
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`/api/appointments/attendants/${id}`, {
                method: 'DELETE',
                headers: authHeaders
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to delete attendant');
            }
        }
    };

    events = {
        list: async (): Promise<Event[]> => {
            const authHeaders = await getAuthHeaders();
            const response = await fetch('/api/appointments/events', {
                headers: authHeaders
            });

            if (!response.ok) {
                console.error('Failed to fetch events');
                return [];
            }

            return await response.json();
        },
        listFeeds: async (sector: string): Promise<Event[]> => {
            const response = await fetch(`/api/public/events/feeds?sector=${encodeURIComponent(sector)}`);
            if (!response.ok) {
                console.error("Error fetching event feeds");
                return [];
            }
            const data = await response.json();
            return data.map((event: any) => ({
                id: event.id,
                event_name: event.event_name,
                start_date: event.start_date,
                end_date: event.end_date,
                status: event.status,
                created_at: event.created_at,
                sector: event.sector,
                self_scheduling_link: event.self_scheduling_link
            }));
        },
        create: async (data: Omit<Event, 'id'>): Promise<Event> => {
            const authHeaders = await getAuthHeaders();
            const response = await fetch('/api/appointments/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Failed to create event');
            }

            return await response.json();
        },
        update: async (id: string, data: Partial<Event>): Promise<Event> => {
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`/api/appointments/events/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Failed to update event');
            }

            return await response.json();
        },
        delete: async (id: string): Promise<void> => {
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`/api/appointments/events/${id}`, {
                method: 'DELETE',
                headers: authHeaders
            });

            if (!response.ok) {
                throw new Error('Failed to delete event');
            }
        }
    };

    unnichatConnections = {
        list: async (): Promise<UnnichatConnection[]> => {
            const authHeaders = await getAuthHeaders();
            const response = await fetch('/api/unnichat-connections', {
                headers: authHeaders
            });
            if (!response.ok) throw new Error('Failed to fetch unnichat connections');
            return await response.json();
        },
        create: async (data: Omit<UnnichatConnection, 'id' | 'created_at'>): Promise<UnnichatConnection> => {
            const authHeaders = await getAuthHeaders();
            const response = await fetch('/api/unnichat-connections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to create unnichat connection');
            }
            return await response.json();
        },
        update: async (id: string | number, data: Partial<UnnichatConnection>): Promise<UnnichatConnection> => {
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`/api/unnichat-connections/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to update unnichat connection');
            }
            return await response.json();
        },
        delete: async (id: string | number): Promise<void> => {
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`/api/unnichat-connections/${id}`, {
                method: 'DELETE',
                headers: authHeaders
            });
            if (!response.ok) throw new Error('Failed to delete unnichat connection');
        }
    };

    clients = {
        getByEmail: async (email: string): Promise<any | null> => {
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`/api/appointments/clients/email/${encodeURIComponent(email)}`, {
                headers: authHeaders
            });

            if (!response.ok) {
                throw new Error('Failed to fetch client by email');
            }

            return await response.json();
        },
        getByPhone: async (phone: string | number): Promise<any | null> => {
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`/api/appointments/clients/phone/${encodeURIComponent(phone)}`, {
                headers: authHeaders
            });

            if (!response.ok) {
                throw new Error('Failed to fetch client by phone');
            }

            return await response.json();
        }
    };
}
