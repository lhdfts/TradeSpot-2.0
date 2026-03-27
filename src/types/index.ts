export type AppointmentStatus = 'Cancelado' | 'Esquecimento' | 'No-show' | 'Pendente' | 'Realizado' | 'Reagendado';
export type AppointmentType = 'Ligação SDR' | 'Ligação Closer' | 'Agendamento Pessoal' | 'Reagendamento Closer' | 'Upgrade' | 'Fora da agenda' | 'Gold Call' | 'Onboarding';
export type ProfileLevel = 'Alto' | 'Mediano' | 'Desconhecido';
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
    status: boolean;
    created_at?: string;
    sector?: string;
    self_scheduling_link?: string;
    duration_minutes?: number;
}

export interface Attendant {
    id: string;
    name: string;
    email: string;
    role: 'Suporte' | 'Qualidade' | 'Co-Líder' | 'Co-líder' | 'Líder' | 'Admin' | 'Dev' | 'Colaborador';
    sector: string; // Relaxed to string to match data like "Closer", "TEI"
    schedule: {
        [key: string]: { start: string; end: string } | null | any; // key is day of week (mon, tue, etc.)
        custom_dates?: { [dateStr: string]: string[] };
    };
    pauses: {
        [key: string]: { start: string; end: string }[];
    };
}

export interface Appointment {
    id: string;
    lead: string;
    phone: number; // Changed to number to match int8
    email?: string;
    date: string;
    time: string;
    end_time?: string;
    type: AppointmentType;
    status: AppointmentStatus;
    attendantId: string;
    attendantName?: string;
    eventId?: string;
    meetLink?: string;
    studentProfile?: StudentProfile;
    notes?: string;
    additionalInfo?: string;
    createdBy?: string;
    user?: { name: string };
    // New fields from DB schema
    interest_level?: ProfileLevel;
    knowledge_level?: KnowledgeLevel;
    financial_currency?: string;
    financial_amount?: number;
    // Status tracking
    oldStatus?: AppointmentStatus;
    updatedBy?: string;
    updater?: {
        name: string;
        sector?: string;
    };
    status_edit_count?: number;
}

export interface User {
    id: string;
    firebase_id?: string; // New field
    name: string;
    email: string; // Added email as it is in the DB
    role: 'Suporte' | 'Qualidade' | 'Co-Líder' | 'Co-líder' | 'Líder' | 'Admin' | 'Dev' | 'Colaborador';
    sector?: string; // Added sector
    // Removed level
}

export interface Client {
    id: string;
    name: string;
    phone: number; // Changed to number to match int8
    email: string;
    interest_level?: ProfileLevel;
    knowledge_level?: KnowledgeLevel;
    financial_currency?: string;
    financial_amount?: number; // Changed to number match int8
}

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
    'Cancelado', 'Esquecimento', 'No-show', 'Pendente', 'Realizado', 'Reagendado'
];
