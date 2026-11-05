import React, { useState, useEffect } from 'react';
import { LoadingState } from '../components/ui/loading-state';
import { staggerStyle } from '../lib/motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Attendant } from '../types';
import { Archive, Edit, Trash2, Users, SearchX, UserPlus } from 'lucide-react';
import { AttendantModal } from '../components/AttendantModal';
import { ArchiveAttendantModal } from '../components/ArchiveAttendantModal';
import { FloatingSelect } from '../components/FloatingSelect';
import { FloatingInput } from '../components/FloatingInput';

import { useAuth } from '../context/AuthContext';
import { canViewAllSectors, isMedinaUser, getAllowedSectors, isDualLeader } from '../utils/security';
import { normalizeSector } from '../constants/sectors';
import { useConfirm } from '../components/ui/confirm-dialog';
import { notify } from '../components/ui/notify';
import { EmptyState } from '../components/ui/empty-state';
import { cn } from '../lib/utils';

// Selo do setor: tokens legíveis nos dois temas.
const sectorBadgeClass = (sector: string) =>
    sector === 'SDR' ? 'bg-primary/10 text-primary border-primary/25' :
        sector === 'Closer' ? 'bg-status-esquecimento/10 text-status-esquecimento border-status-esquecimento/25' :
            'bg-muted text-muted-foreground border-border';

export const Attendants: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [attendants, setAttendants] = useState<Attendant[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAttendant, setSelectedAttendant] = useState<Attendant | null>(null);
    const [attendantToArchive, setAttendantToArchive] = useState<Attendant | null>(null);
    const [loading, setLoading] = useState(true);
    const [sectorFilter, setSectorFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');

    const fetchAttendants = async () => {
        setLoading(true);
        try {
            const data = await api.attendants.list();
            const allowedSectors = getAllowedSectors(user);

            if (canViewAllSectors(user) || isMedinaUser(user) || user?.role === 'Admin' || user?.role === 'Dev' || isDualLeader(user)) {
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

    const handleDelete = async (attendant: Attendant) => {
        const ok = await confirm({
            title: `Excluir ${attendant.name}?`,
            description: 'O acesso, a escala e as pausas deste atendente serão apagados. Para só tirar a pessoa da distribuição, use "Arquivar atendente".',
            confirmLabel: 'Excluir atendente',
            cancelLabel: 'Cancelar',
            destructive: true,
        });
        if (!ok) return;
        try {
            await api.attendants.delete(attendant.id);
            notify.success('Atendente excluído', attendant.name);
            fetchAttendants();
        } catch (error: any) {
            console.error('Failed to delete attendant', error);
            notify.error(`Não foi possível excluir ${attendant.name}.`, 'Se ele tiver agendamentos, arquive em vez de excluir. Senão, verifique a conexão e tente de novo.');
        }
    };

    // Admin/Dev arquivam qualquer um; o Líder, só colaboradores do próprio setor (regra repetida no backend).
    const canArchive = (attendant: Attendant) => {
        if (!user || attendant.id === user.id) return false;
        if (['Admin', 'Dev'].includes(user.role)) return true;
        return user.role === 'Líder' &&
            !['Admin', 'Dev'].includes(attendant.role) &&
            normalizeSector(attendant.sector) === normalizeSector(user.sector);
    };

    const navigateToAppointments = (attendantName: string) => {
        navigate(`/all-appointments?attendant=${encodeURIComponent(attendantName)}`);
    };

    if (loading) return <LoadingState />;

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

    const canCreate = user?.sector === 'TEI' || user?.role === 'Dev' || user?.role === 'Admin';
    const canDelete = ['Admin', 'Dev'].includes(user?.role || '');

    // Ações da linha: só ícone, com nome acessível que cita o atendente.
    const rowActions = (attendant: Attendant) => (
        <>
            <button
                type="button"
                onClick={() => handleEdit(attendant)}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Editar atendente"
                aria-label={`Editar atendente ${attendant.name}`}
            >
                <Edit size={18} />
            </button>
            {canArchive(attendant) && (
                <button
                    type="button"
                    onClick={() => setAttendantToArchive(attendant)}
                    className="p-2 rounded-md text-muted-foreground hover:text-status-iniciando hover:bg-muted transition-colors"
                    title="Arquivar atendente"
                    aria-label={`Arquivar atendente ${attendant.name}`}
                >
                    <Archive size={18} />
                </button>
            )}
            {canDelete && (
                <button
                    type="button"
                    onClick={() => handleDelete(attendant)}
                    className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Excluir atendente"
                    aria-label={`Excluir atendente ${attendant.name}`}
                >
                    <Trash2 size={18} />
                </button>
            )}
        </>
    );

    const nameLink = (attendant: Attendant, className?: string) => (
        <button
            type="button"
            onClick={() => navigateToAppointments(attendant.name)}
            className={cn('text-left hover:text-primary hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm', className)}
            title="Ver agendamentos"
            aria-label={`Ver agendamentos de ${attendant.name}`}
        >
            {attendant.name}
        </button>
    );

    const hasFilters = !!searchTerm.trim() || sectorFilter !== 'all';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="w-full sm:w-64">
                        <FloatingInput
                            label="Pesquisar por nome ou email"
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {(canViewAllSectors(user) || isMedinaUser(user) || isDualLeader(user)) && (
                        <FloatingSelect
                            label="Setor"
                            value={sectorFilter}
                            onChange={(e: any) => setSectorFilter(e.target.value)}
                            options={[
                                { value: 'all', label: 'Todos os Setores' },
                                ...getAllowedSectors(user).map(sector => ({ value: sector, label: sector }))
                            ]}
                            className="w-full sm:w-44"
                        />
                    )}
                </div>

                {canCreate && (
                    <button
                        type="button"
                        onClick={handleCreate}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        Criar atendente
                    </button>
                )}
            </div>

            {displayAttendants.length === 0 ? (
                hasFilters ? (
                    <EmptyState
                        icons={[SearchX]}
                        title="Nenhum atendente com esses filtros"
                        description={searchTerm.trim()
                            ? `Nada encontrado para "${searchTerm}". Confira a grafia ou busque pelo email.`
                            : 'Nenhum atendente neste setor. Escolha outro setor.'}
                        action={{ label: 'Limpar filtros', onClick: () => { setSearchTerm(''); setSectorFilter('all'); } }}
                    />
                ) : (
                    <EmptyState
                        icons={[Users]}
                        title="Nenhum atendente ainda"
                        description="Atendentes recebem os agendamentos distribuídos e acessam o sistema com o email cadastrado."
                        action={canCreate ? { label: 'Criar atendente', icon: UserPlus, onClick: handleCreate } : undefined}
                    />
                )
            ) : (
                <>
                    {/* Tabela (desktop) */}
                    <div style={staggerStyle(0, 80)} className="hidden md:block animate-fade-up bg-surface rounded-lg border border-border overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
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
                                    {displayAttendants.map((attendant, i) => (
                                        <tr style={staggerStyle(i, 30)} key={attendant.id} className="animate-fade-up hover:bg-background/50 transition-colors">
                                            <td className="px-6 py-4 text-foreground font-medium">
                                                {nameLink(attendant)}
                                            </td>
                                            <td className="px-6 py-4 text-foreground break-all">{attendant.email}</td>
                                            <td className="px-6 py-4">
                                                <span className={cn('px-2 py-1 rounded-full text-xs font-semibold border whitespace-nowrap', sectorBadgeClass(attendant.sector as string))}>
                                                    {attendant.sector}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-foreground">{attendant.role}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    {rowActions(attendant)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Cards (mobile) */}
                    <ul className="md:hidden space-y-3">
                        {displayAttendants.map((attendant, i) => (
                            <li
                                key={attendant.id}
                                style={staggerStyle(i, 40)}
                                className="animate-fade-up bg-surface p-4 rounded-lg border border-border shadow-sm space-y-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        {nameLink(attendant, 'font-semibold text-foreground break-words')}
                                        <p className="text-sm text-muted-foreground break-all mt-0.5">{attendant.email}</p>
                                    </div>
                                    <span className={cn('shrink-0 px-2 py-1 rounded-full text-xs font-semibold border whitespace-nowrap', sectorBadgeClass(attendant.sector as string))}>
                                        {attendant.sector}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                                    <span className="text-sm text-muted-foreground">{attendant.role}</span>
                                    <div className="flex items-center gap-1">
                                        {rowActions(attendant)}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <AttendantModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchAttendants}
                attendant={selectedAttendant}
            />

            <ArchiveAttendantModal
                attendant={attendantToArchive}
                onClose={() => setAttendantToArchive(null)}
                onSuccess={fetchAttendants}
                onViewAppointments={navigateToAppointments}
            />
        </div>
    );
};
