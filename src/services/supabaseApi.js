"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseApiService = void 0;
const firebase_1 = require("../lib/firebase");
class SupabaseApiService {
    constructor() {
        this.appointments = {
            list: (params) => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                let url = '/api/appointments';
                if ((params === null || params === void 0 ? void 0 : params.startDate) || (params === null || params === void 0 ? void 0 : params.endDate)) {
                    const searchParams = new URLSearchParams();
                    if (params.startDate)
                        searchParams.append('startDate', params.startDate);
                    if (params.endDate)
                        searchParams.append('endDate', params.endDate);
                    url += `?${searchParams.toString()}`;
                }
                const response = yield fetch(url, {
                    headers: authHeaders
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch appointments');
                }
                return yield response.json();
            }),
            create: (data) => __awaiter(this, void 0, void 0, function* () {
                // New Secure Flow (Spec 2.B): Send to Node.js Backend for Validation & Creation
                // Backend URL - uses local proxy or Vercel function
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch('/api/appointments', {
                    method: 'POST',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    const errorData = yield response.json();
                    console.error("Backend Error:", errorData);
                    // Throw object with response structure for local handling
                    throw { response: { status: response.status, data: errorData } };
                }
                const createdAppointment = yield response.json();
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
                };
            }),
            update: (id, data) => __awaiter(this, void 0, void 0, function* () {
                // New Secure Flow: Send to Node.js Backend for Update & Webhook Trigger
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch(`/api/appointments/${id}`, {
                    method: 'PUT',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    const errorData = yield response.json();
                    console.error("Backend Update Error:", errorData);
                    throw { response: { status: response.status, data: errorData } };
                }
                const updatedAppointment = yield response.json();
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
                };
            })
        };
        this.attendants = {
            list: () => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch('/api/appointments/attendants', {
                    headers: authHeaders
                });
                if (!response.ok) {
                    console.error('Failed to fetch attendants');
                    return [];
                }
                return yield response.json();
            }),
            create: (data) => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch('/api/appointments/attendants', {
                    method: 'POST',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    const errorData = yield response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to create attendant');
                }
                return yield response.json();
            }),
            update: (id, data) => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch(`/api/appointments/attendants/${id}`, {
                    method: 'PUT',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    const errorData = yield response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to update attendant');
                }
                return yield response.json();
            }),
            delete: (id) => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch(`/api/appointments/attendants/${id}`, {
                    method: 'DELETE',
                    headers: authHeaders
                });
                if (!response.ok) {
                    const errorData = yield response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to delete attendant');
                }
            })
        };
        this.events = {
            list: () => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch('/api/appointments/events', {
                    headers: authHeaders
                });
                if (!response.ok) {
                    console.error('Failed to fetch events');
                    return [];
                }
                return yield response.json();
            }),
            listFeeds: (sector) => __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`/api/public/events/feeds?sector=${encodeURIComponent(sector)}`);
                if (!response.ok) {
                    console.error("Error fetching event feeds");
                    return [];
                }
                const data = yield response.json();
                return data.map((event) => ({
                    id: event.id,
                    event_name: event.event_name,
                    start_date: event.start_date,
                    end_date: event.end_date,
                    status: event.status,
                    created_at: event.created_at,
                    sector: event.sector,
                    self_scheduling_link: event.self_scheduling_link
                }));
            }),
            create: (data) => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch('/api/appointments/events', {
                    method: 'POST',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    throw new Error('Failed to create event');
                }
                return yield response.json();
            }),
            update: (id, data) => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch(`/api/appointments/events/${id}`, {
                    method: 'PUT',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    throw new Error('Failed to update event');
                }
                return yield response.json();
            }),
            delete: (id) => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch(`/api/appointments/events/${id}`, {
                    method: 'DELETE',
                    headers: authHeaders
                });
                if (!response.ok) {
                    throw new Error('Failed to delete event');
                }
            })
        };
        this.unnichatConnections = {
            list: () => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch('/api/unnichat-connections', {
                    headers: authHeaders
                });
                if (!response.ok)
                    throw new Error('Failed to fetch unnichat connections');
                return yield response.json();
            }),
            create: (data) => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch('/api/unnichat-connections', {
                    method: 'POST',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    const err = yield response.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to create unnichat connection');
                }
                return yield response.json();
            }),
            update: (id, data) => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch(`/api/unnichat-connections/${id}`, {
                    method: 'PUT',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    const err = yield response.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to update unnichat connection');
                }
                return yield response.json();
            }),
            delete: (id) => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch(`/api/unnichat-connections/${id}`, {
                    method: 'DELETE',
                    headers: authHeaders
                });
                if (!response.ok)
                    throw new Error('Failed to delete unnichat connection');
            })
        };
        this.clients = {
            getByEmail: (email) => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch(`/api/appointments/clients/email/${encodeURIComponent(email)}`, {
                    headers: authHeaders
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch client by email');
                }
                return yield response.json();
            }),
            getByPhone: (phone) => __awaiter(this, void 0, void 0, function* () {
                const authHeaders = yield (0, firebase_1.getAuthHeaders)();
                const response = yield fetch(`/api/appointments/clients/phone/${encodeURIComponent(phone)}`, {
                    headers: authHeaders
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch client by phone');
                }
                return yield response.json();
            })
        };
    }
}
exports.SupabaseApiService = SupabaseApiService;
