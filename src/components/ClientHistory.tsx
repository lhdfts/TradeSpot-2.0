import React from 'react';
import { useAppointments } from '../context/AppointmentContext';


interface ClientHistoryProps {
    phone: string;
}

export const ClientHistory: React.FC<ClientHistoryProps> = ({ phone }) => {
    const { appointments } = useAppointments();

    if (!phone) return null;

    // Clean phone for comparison
    const cleanPhone = String(phone).replace(/\D/g, '');

    const clientAppointments = appointments
        .filter(a => {
            const appPhone = String(a.phone).replace(/\D/g, '');
            return appPhone === cleanPhone;
        })
        .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA.getTime() - dateB.getTime();
        });

    if (clientAppointments.length === 0) return null;

    return (
        <div className="w-64 border-l border-border bg-card p-6 flex flex-col gap-6 hidden md:flex overflow-y-auto max-h-[600px]">
            <h3 className="font-semibold text-lg text-foreground">Histórico</h3>
            <div className="relative flex flex-col gap-0">
                {/* Continuous Vertical line */}
                <div className="absolute left-[11px] top-3 bottom-5 w-[2px] bg-gray-200" />

                {clientAppointments.map((app) => {
                    const status = app.status || 'Pendente';
                    let Icon, bgColor;

                    // Status Logic & Colors
                    // Colors matched to AllAppointments.tsx status tags (using solid 500 shade)
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
                    } else if (status === 'Reagendado' || (app.type as any) === 'Reschedule') {
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

                    // Normalize type name for display if needed
                    let displayType = app.type as string;
                    if (displayType === 'Reschedule') displayType = 'Reagendamento Closer';

                    return (
                        <div key={app.id} className="flex gap-3 pb-8 last:pb-0 relative min-h-[32px]">
                            {/* Icon Container */}
                            <div className="relative z-10 flex items-start pt-[2px]">
                                <div className={`w-6 h-6 rounded-full ${bgColor} flex items-center justify-center shadow-sm`}>
                                    {Icon}
                                </div>
                            </div>

                            {/* Text */}
                            <div className="flex flex-col pt-0.5">
                                <span className={`text-sm font-medium leading-none text-foreground`}>
                                    {displayType}
                                </span>
                                <span className="text-xs text-muted-foreground mt-1">
                                    {new Date(app.date).toLocaleDateString('pt-BR')} - {app.time}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
