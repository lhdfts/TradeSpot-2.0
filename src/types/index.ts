export type AppointmentStatus = 'Cancelado' | 'Esquecimento' | 'Não compareceu' | 'Pendente' | 'Realizado' | 'Reagendado';
export type AppointmentType = 'Ligação SDR' | 'Ligação Closer' | 'Personal Appointment' | 'Reschedule';
export type ProfileLevel = 'Baixo' | 'Médio' | 'Alto';
export type KnowledgeLevel = 'Iniciante' | 'Intermediário' | 'Avançado';

export interface StudentProfile {
    interest: ProfileLevel;
    knowledge: KnowledgeLevel;
    financial: {
        currency: string;
        amount: string;
    };
}

export interface Event {
    id: string;
    event_name: string;
    start_date: string;
    end_date: string;
    status: 'Active' | 'Archived';
    created_at?: string;
}

export interface Attendant {
    id: string;
    name: string;
    email: string;
    sector: 'SDR' | 'Closer' | 'Admin';
    schedule: {
        [key: string]: { start: string; end: string } | null; // key is day of week (mon, tue, etc.)
    };
    pauses: { start: string; end: string }[];
}

export interface Appointment {
    id: string;
    lead: string;
    phone: string;
    email?: string;
    date: string;
    time: string;
    type: AppointmentType;
    status: AppointmentStatus;
    attendantId: string;
    eventId?: string;
    meetLink?: string;
    studentProfile?: StudentProfile;
    notes?: string;
    additionalInfo?: string;
    createdBy: string;
}

export interface User {
    id: string;
    name: string;
    role: 'SDR' | 'Closer' | 'Admin';
    level: 1 | 2 | 5;
}

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
    'Cancelado', 'Esquecimento', 'Não compareceu', 'Pendente', 'Realizado', 'Reagendado'
];
