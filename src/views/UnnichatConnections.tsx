import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import type { UnnichatConnection } from '../types';
import { Button } from '../components/ui/button';
import { FloatingSelect } from '../components/FloatingSelect';
import { FloatingInput } from '../components/FloatingInput';
import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import { UnnichatConnectionModal } from '../components/UnnichatConnectionModal';
import { useAuth } from '../context/AuthContext';
import { canViewAllSectors, isMedinaUser, getAllowedSectors } from '../utils/security';

export const UnnichatConnections: React.FC = () => {
    const { user } = useAuth();
    const [connections, setConnections] = useState<UnnichatConnection[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedConnection, setSelectedConnection] = useState<UnnichatConnection | null>(null);
    const [loading, setLoading] = useState(true);
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
    const [sectorFilter, setSectorFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');

    useEffect(() => {
        setPortalContainer(document.getElementById('header-actions'));
    }, []);

    const fetchConnections = async () => {
        setLoading(true);
        try {
            const data = await api.unnichatConnections.list();

            const allowedSectors = getAllowedSectors(user);
            const isSuperUser = canViewAllSectors(user) || user?.role === 'Admin' || user?.role === 'Dev' || user?.role === 'Qualidade' || user?.sector === 'TEI';

            const filteredData = isSuperUser || isMedinaUser(user)
                ? data.filter(conn => !conn.sector || allowedSectors.includes(conn.sector))
                : data.filter(conn => conn.sector === user?.sector || !conn.sector);

            setConnections(filteredData);
        } catch (error) {
            console.error('Failed to fetch unnichat connections', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConnections();
    }, [user]);

    const handleEdit = (conn: UnnichatConnection) => {
        setSelectedConnection(conn);
        setIsModalOpen(true);
    };

    const handleDelete = async (conn: UnnichatConnection) => {
        if (!confirm(`Tem certeza que deseja excluir a conexão "${conn.name}"?`)) return;
        try {
            await api.unnichatConnections.delete(conn.id);
            await fetchConnections();
        } catch (error: any) {
            console.error('Failed to delete connection', error);
            alert('Erro ao excluir conexão unnichat.');
        }
    };

    const handleAddNew = () => {
        setSelectedConnection(null);
        setIsModalOpen(true);
    };

    if (loading) return <div className="p-4 text-foreground">Carregando...</div>;

    const canManageConnections = ['Dev', 'Admin', 'Líder'].includes(user?.role || '') || user?.sector === 'TEI';

    const displayConnections = connections.filter(c => {
        const matchesSector = sectorFilter === 'all' || c.sector === sectorFilter;
        const matchesSearch = !searchTerm.trim() ||
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.unnichat_url.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSector && matchesSearch;
    });

    return (
        <div className="space-y-6">
            {portalContainer && canManageConnections && createPortal(
                <Button onClick={handleAddNew} variant="default">
                    <Plus size={18} className="mr-2" /> Nova Conexão
                </Button>,
                portalContainer
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="w-72">
                        <FloatingInput
                            label="Pesquisar por nome ou link"
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {(canViewAllSectors(user) || isMedinaUser(user) || user?.role === 'Admin' || user?.role === 'Dev' || user?.sector === 'TEI') && (
                        <FloatingSelect
                            label="Setor"
                            value={sectorFilter}
                            onChange={(e: any) => setSectorFilter(e.target.value)}
                            options={[
                                { value: 'all', label: 'Todos os Setores' },
                                ...getAllowedSectors(user).map(sector => ({ value: sector, label: sector }))
                            ]}
                            className="w-48"
                        />
                    )}
                </div>
            </div>

            <div className="bg-surface rounded-lg border border-border overflow-hidden shadow-lg">
                <table className="w-full text-left">
                    <thead className="bg-[#141414] text-white text-xs uppercase tracking-wider font-bold" style={{ backgroundColor: '#141414' }}>
                        <tr>
                            <th className="px-6 py-4">Nome da Conexão</th>
                            <th className="px-6 py-4">Setor</th>
                            <th className="px-6 py-4">Link do Webhook</th>
                            <th className="px-6 py-4">Data de Criação</th>
                            {canManageConnections && (<th className="px-6 py-4 text-center">Ações</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {displayConnections.length === 0 ? (
                            <tr>
                                <td colSpan={canManageConnections ? 5 : 4} className="px-6 py-8 text-center text-muted-foreground">
                                    Nenhuma conexão encontrada.
                                </td>
                            </tr>
                        ) : (
                            displayConnections.map(conn => (
                                <tr key={conn.id} className="hover:bg-background/50 transition-colors">
                                    <td className="px-6 py-4 text-foreground font-medium">
                                        {conn.name}
                                    </td>
                                    <td className="px-6 py-4 text-foreground">
                                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                            {conn.sector || 'Global / Geral'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs max-w-md truncate">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate">{conn.unnichat_url}</span>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(conn.unnichat_url);
                                                    alert('Link copiado com sucesso!');
                                                }}
                                                className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                                                title="Copiar Link"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-foreground text-sm">
                                        {conn.created_at ? new Date(conn.created_at).toLocaleDateString('pt-BR') : '-'}
                                    </td>
                                    {canManageConnections && (
                                        <td className="px-6 py-4 text-center space-x-3">
                                            <button
                                                onClick={() => handleEdit(conn)}
                                                className="text-foreground hover:text-primary transition-colors inline-block"
                                                title="Editar"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(conn)}
                                                className="text-destructive hover:text-red-400 transition-colors inline-block"
                                                title="Excluir"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <UnnichatConnectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchConnections}
                connection={selectedConnection}
            />
        </div>
    );
};
