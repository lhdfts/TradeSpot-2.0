import React from 'react';
import { useAppointments } from '../context/AppointmentContext';


interface ExternalHistoryItem {
    id: number;
    productName: string;
    date: string;
    time?: string;
    status: string;
    statusLabel?: string;
    warn?: boolean;
}

interface ClientHistoryProps {
    phone: string;
    externalHistory?: ExternalHistoryItem[];
}

export const ClientHistory: React.FC<ClientHistoryProps> = ({ phone, externalHistory = [] }) => {
    const { appointments } = useAppointments();

    // Requests from user: "hide the client History if the number field is empty"
    // We expect a valid phone to show ANY history (internal or external).
    if (!phone || phone.trim() === '') return null;

    // Clean phone for comparison
    const cleanPhone = String(phone).replace(/\D/g, '');

    // 1. Get Internal Appointments
    const internalHistory = appointments
        .filter(a => {
            const appPhone = String(a.phone).replace(/\D/g, '');
            return appPhone === cleanPhone;
        })
        .map(a => ({
            ...a,
            source: 'internal' as const,
            sortDate: new Date(`${a.date}T${a.time}`)
        }));

    // 2. Get External History
    const externalItems = externalHistory.map(item => {
        const prefix = item.statusLabel || 'Comprou';
        return {
            ...item,
            source: 'external' as const,
            type: `${prefix} ${item.productName}`, // Display text e.g. "Comprou Name"
            sortDate: new Date(`${item.date}T${item.time || '00:00:00'}`)
        };
    });

    // 3. Merge and Sort
    const combinedHistory = [...internalHistory, ...externalItems].sort((a, b) => {
        return a.sortDate.getTime() - b.sortDate.getTime(); // Ascending (oldest first)
    });

    if (combinedHistory.length === 0) return null;

    return (
        <div className="w-64 border-l border-border bg-card p-6 flex flex-col gap-6 hidden md:flex overflow-y-auto max-h-[600px]">
            <h3 className="font-semibold text-lg text-foreground">Histórico</h3>
            <div className="relative flex flex-col gap-0">
                {/* Continuous Vertical line */}
                <div className="absolute left-[11px] top-3 bottom-5 w-[2px] bg-gray-200" />

                {combinedHistory.map((item, idx) => {
                    const isExternal = item.source === 'external';
                    const status = item.status || 'Pendente';
                    let Icon, bgColor;

                    if (isExternal) {
                        // External Purchase / Deal
                        Icon = (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <path d="M16 10a4 4 0 0 1-8 0"></path>
                            </svg>
                        );
                        const prefix = item.statusLabel || 'Comprou';

                        // Icon logic: if it's a status event (Blocked/Cancelled), use Red bg. 
                        // Otherwise (Comprou), use Green.
                        if (prefix === 'Bloqueado' || prefix === 'Cancelado') {
                            bgColor = 'bg-red-500'; // Red for blocked/cancelled status
                        } else {
                            bgColor = 'bg-emerald-500'; // Greenish for component
                        }
                    } else {
                        // Internal Appointment Status Logic
                        if (status === 'Realizado' || (status as any) === 'Confirmado' || (status as any) === 'Concluido') {
                            Icon = (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            );
                            bgColor = 'bg-green-500';
                        } else if (status === 'Cancelado') {
                            Icon = (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            );
                            bgColor = 'bg-red-500';
                        } else if (status === 'Reagendado' || (item.type as any) === 'Reschedule') {
                            Icon = (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                            );
                            bgColor = 'bg-blue-500';
                        } else if (status === 'Esquecimento') {
                            Icon = (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            );
                            bgColor = 'bg-orange-500';
                        } else if (status === 'Não compareceu') {
                            Icon = (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            );
                            bgColor = 'bg-purple-500';
                        } else if (status === 'Pendente') {
                            Icon = (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            );
                            bgColor = 'bg-yellow-500';
                        } else {
                            // Default fallback
                            Icon = (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            );
                            bgColor = 'bg-gray-500';
                        }
                    }

                    // Normalize type name for display if needed
                    let displayType = item.type as string;
                    if (displayType === 'Reschedule') displayType = 'Reagendamento Closer';

                    // Display date logic
                    const dateObj = new Date(item.date);
                    const dateStr = dateObj.toLocaleDateString('pt-BR');
                    const timeStr = item.time ? item.time.substring(0, 5) : '';

                    return (
                        <div key={`${isExternal ? 'ext' : 'int'}-${item.id}-${idx}`} className="flex gap-3 pb-8 last:pb-0 relative min-h-[32px]">
                            {/* Icon Container */}
                            <div className="relative z-10 flex items-start pt-[2px]">
                                <div className={`w-6 h-6 rounded-full ${bgColor} flex items-center justify-center shadow-sm`}>
                                    {Icon}
                                </div>
                            </div>

                            {/* Text */}
                            <div className="flex flex-col pt-0.5">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium leading-none text-foreground`}>
                                        {displayType}
                                    </span>
                                    {/* Warning Icon for Blocked/Cancelled External Items */}
                                    {isExternal && (item as any).warn && (
                                        <span title={(item as any).tooltip || undefined} className="cursor-help flex items-center">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="text-yellow-500"
                                            >
                                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                                <path d="M12 9v4" />
                                                <path d="M12 17h.01" />
                                            </svg>
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground mt-1">
                                    {dateStr} {timeStr && `- ${timeStr}`}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
