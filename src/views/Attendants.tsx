import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Attendant } from '../types';
import { Edit, Trash2 } from 'lucide-react';
import { AttendantModal } from '../components/AttendantModal';
import { FloatingSelect } from '../components/FloatingSelect';
import { FloatingInput } from '../components/FloatingInput';

import { useAuth } from '../context/AuthContext';
import { canViewAllSectors, isMedinaUser, getAllowedSectors } from '../utils/security';

export const Attendants: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [attendants, setAttendants] = useState<Attendant[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAttendant, setSelectedAttendant] = useState<Attendant | null>(null);
    const [loading, setLoading] = useState(true);
    const [sectorFilter, setSectorFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');

    const fetchAttendants = async () => {
        setLoading(true);
        try {
            const data = await api.attendants.list();
            const allowedSectors = getAllowedSectors(user);

            if (canViewAllSectors(user) || isMedinaUser(user) || user?.role === 'Admin' || user?.role === 'Dev') {
                setAttendants(data.filter(a => allowedSectors.includes(a.sector)));
            } else if (user?.sector) {
                setAttendants(data.filter(a => a.sector === user.sector));
            } else {
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
    }, [user]);

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

    const displayAttendants = (sectorFilter === 'all' 
        ? attendants 
        : attendants.filter(a => a.sector === sectorFilter)
    ).filter(a => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            a.name.toLowerCase().includes(term) || 
            a.email.toLowerCase().includes(term)
        );
    });

    const handleCreate = () => {
        setSelectedAttendant(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-64">
                        <FloatingInput
                            label="Pesquisar por nome ou email"
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {(canViewAllSectors(user) || isMedinaUser(user)) && (
                        <FloatingSelect
                            label="Setor"
                            value={sectorFilter}
                            onChange={(e: any) => setSectorFilter(e.target.value)}
                            options={[
                                { value: 'all', label: 'Todos os Setores' },
                                ...getAllowedSectors(user).map(sector => ({ value: sector, label: sector }))
                            ]}
                            className="w-44"
                        />
                    )}
                </div>

                {user?.sector === 'TEI' && (
                    <button
                        onClick={handleCreate}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        Criar Atendente
                    </button>
                )}
            </div>

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
                        {displayAttendants.map(attendant => (
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
                                <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleEdit(attendant)}
                                        className="p-1 text-secondary hover:text-foreground transition-colors"
                                        title="Editar Atendente"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    {['Admin', 'Dev'].includes(user?.role || '') && (
                                        <button
                                            onClick={() => handleDelete(attendant.id)}
                                            className="p-1 text-secondary hover:text-destructive transition-colors"
                                            title="Excluir Atendente"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
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
