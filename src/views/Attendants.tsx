import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Attendant } from '../types';
import { Edit, Trash2 } from 'lucide-react';
import { AttendantModal } from '../components/AttendantModal';

import { useAuth } from '../context/AuthContext';

export const Attendants: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [attendants, setAttendants] = useState<Attendant[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAttendant, setSelectedAttendant] = useState<Attendant | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchAttendants = async () => {
        setLoading(true);
        try {
            const data = await api.attendants.list();
            if (user?.role === 'Dev' || user?.sector === 'TEI') {
                setAttendants(data);
            } else if (user?.sector) {
                setAttendants(data.filter(a => a.sector === user.sector));
            } else {
                // Fallback: If no sector defined on user, maybe show none or all? 
                // Let's assume strict privacy: show none, or maybe just their own if ID matches (but Attendants page is usually for managers).
                // However, the rule "Colaborador: metrics, attendants and events -> SHOULDNT have access" handles the page access.
                // The users reaching here are Lider/Admin. Admin usually has no sector or global.
                // Let's safe default to data for Admin/Lider if they managed to get here.
                setAttendants(data);
            }
        } catch (error) {
            console.error('Failed to fetch attendants', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendants();
    }, []);

    const handleEdit = (attendant: Attendant) => {
        setSelectedAttendant(attendant);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este atendente?')) {
            await api.attendants.delete(id);
            fetchAttendants();
        }
    };

    const navigateToAppointments = (attendantName: string) => {
        navigate(`/all-appointments?attendant=${encodeURIComponent(attendantName)}`);
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div className="space-y-6">


            <div className="bg-surface rounded-lg border border-border overflow-hidden shadow-lg">
                <table className="w-full text-left">
                    <thead className="bg-[#141414] text-white text-xs uppercase tracking-wider font-bold" style={{ backgroundColor: '#141414' }}>
                        <tr>
                            <th className="px-6 py-4">Nome</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Setor</th>
                            <th className="px-6 py-4">Função</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {attendants.map(attendant => (
                            <tr key={attendant.id} className="hover:bg-background/50 transition-colors">
                                <td className="px-6 py-4 text-foreground font-medium">
                                    <span
                                        onClick={() => navigateToAppointments(attendant.name)}
                                        className="cursor-pointer hover:text-primary transition-colors"
                                        title="Ver agendamentos"
                                    >
                                        {attendant.name}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-foreground">{attendant.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${(attendant.sector as string) === 'SDR' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                        (attendant.sector as string) === 'Closer' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                            'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                        }`}>
                                        {attendant.sector}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-foreground">{attendant.role}</td>
                                <td className="px-6 py-4 text-center space-x-2">
                                    <button
                                        onClick={() => handleEdit(attendant)}
                                        className="text-foreground hover:text-primary transition-colors"
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(attendant.id)}
                                        className="text-foreground hover:text-danger transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AttendantModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchAttendants}
                attendant={selectedAttendant}
            />
        </div>
    );
};
