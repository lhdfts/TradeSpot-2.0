import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Attendant } from '../types';
import { Button } from '../components/ui/Button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { AttendantModal } from '../components/AttendantModal';

export const Attendants: React.FC = () => {
    const [attendants, setAttendants] = useState<Attendant[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAttendant, setSelectedAttendant] = useState<Attendant | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchAttendants = async () => {
        setLoading(true);
        try {
            const data = await api.attendants.list();
            setAttendants(data);
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

    const handleAddNew = () => {
        setSelectedAttendant(null);
        setIsModalOpen(true);
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-surface p-4 rounded-lg border border-border shadow-sm">
                <h2 className="text-lg font-semibold text-foreground">Gerenciar Atendentes</h2>
                <Button onClick={handleAddNew}>
                    <Plus size={18} className="mr-2" /> Novo Atendente
                </Button>
            </div>

            <div className="bg-surface rounded-lg border border-border overflow-hidden shadow-lg">
                <table className="w-full text-left">
                    <thead className="bg-[#141414] text-white text-xs uppercase tracking-wider font-bold">
                        <tr>
                            <th className="px-6 py-4">Nome</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Setor</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {attendants.map(attendant => (
                            <tr key={attendant.id} className="hover:bg-background/50 transition-colors">
                                <td className="px-6 py-4 text-foreground font-medium">{attendant.name}</td>
                                <td className="px-6 py-4 text-foreground">{attendant.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${attendant.sector === 'SDR' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                        attendant.sector === 'Closer' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                            'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                        }`}>
                                        {attendant.sector}
                                    </span>
                                </td>
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
