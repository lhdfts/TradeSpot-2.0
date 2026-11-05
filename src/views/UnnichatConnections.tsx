import React, { useState, useEffect } from 'react';
import { LoadingState } from '../components/ui/loading-state';
import { staggerStyle } from '../lib/motion';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import type { UnnichatConnection } from '../types';
import { Button } from '../components/ui/button';
import { FloatingSelect } from '../components/FloatingSelect';
import { FloatingInput } from '../components/FloatingInput';
import { Plus, Edit, Trash2, Copy, Webhook, SearchX } from 'lucide-react';
import { UnnichatConnectionModal } from '../components/UnnichatConnectionModal';
import { useAuth } from '../context/AuthContext';
import { canViewAllSectors, isMedinaUser, getAllowedSectors } from '../utils/security';
import { useConfirm } from '../components/ui/confirm-dialog';
import { notify } from '../components/ui/notify';
import { EmptyState } from '../components/ui/empty-state';

export const UnnichatConnections: React.FC = () => {
    const { user } = useAuth();
    const confirm = useConfirm();
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
        const ok = await confirm({
            title: `Excluir ${conn.name}?`,
            description: 'Os leads enviados pelo Unnichat para este webhook deixarão de virar agendamentos. Os agendamentos já criados continuam.',
            confirmLabel: 'Excluir conexão',
            cancelLabel: 'Cancelar',
            destructive: true,
        });
        if (!ok) return;
        try {
            await api.unnichatConnections.delete(conn.id);
            notify.success('Conexão excluída', conn.name);
            await fetchConnections();
        } catch (error: any) {
            console.error('Failed to delete connection', error);
            notify.error(`Não foi possível excluir ${conn.name}.`, 'Verifique a conexão e tente de novo.');
        }
    };

    const handleAddNew = () => {
        setSelectedConnection(null);
        setIsModalOpen(true);
    };

    if (loading) return <LoadingState />;

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
                // No celular só o ícone, para caber ao lado do título
                <Button onClick={handleAddNew} variant="default" aria-label="Nova conexão" title="Nova conexão" className="px-2.5 sm:px-4">
                    <Plus size={18} className="sm:mr-2" /><span className="hidden sm:inline">Nova conexão</span>
                </Button>,
                portalContainer
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                    <div className="w-full sm:w-72">
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
                            className="w-full sm:w-48"
                        />
                    )}
                </div>
            </div>

            {displayConnections.length === 0 ? (
                searchTerm.trim() || sectorFilter !== 'all' ? (
                    <EmptyState
                        icons={[SearchX]}
                        title="Nenhuma conexão com esses filtros"
                        description={searchTerm.trim() ? `Nada encontrado para "${searchTerm}". Busque pelo nome ou por parte do link.` : 'Nenhuma conexão neste setor. Escolha outro setor.'}
                        action={{ label: 'Limpar filtros', onClick: () => { setSearchTerm(''); setSectorFilter('all'); } }}
                    />
                ) : (
                    <EmptyState
                        icons={[Webhook]}
                        title="Nenhuma conexão ainda"
                        description="Cada conexão gera um webhook: os leads que o Unnichat envia para ele viram agendamentos automaticamente."
                        action={canManageConnections ? { label: 'Nova conexão', icon: Plus, onClick: handleAddNew } : undefined}
                    />
                )
            ) : (
            <div style={staggerStyle(0, 80)} className="animate-fade-up bg-surface rounded-lg border border-border overflow-hidden shadow-sm">
                {/* Rolagem horizontal em telas pequenas para não cortar colunas */}
                <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[760px]">
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
                        {displayConnections.map((conn, i) => (
                                <tr style={staggerStyle(i, 30)} key={conn.id} className="animate-fade-up hover:bg-background/50 transition-colors">
                                    <td className="px-6 py-4 text-foreground font-medium">
                                        {conn.name}
                                    </td>
                                    <td className="px-6 py-4 text-foreground">
                                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                            {conn.sector || 'Global / Geral'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs max-w-md truncate">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {/* Link longo fica truncado; o title e o botão de copiar dão acesso ao valor completo */}
                                            <span className="truncate" title={conn.unnichat_url}>{conn.unnichat_url}</span>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        await navigator.clipboard.writeText(conn.unnichat_url);
                                                        notify.success('Link copiado', `Webhook de ${conn.name}.`);
                                                    } catch {
                                                        notify.error('Não foi possível copiar o link.', 'Permita o acesso à área de transferência no navegador e tente de novo.');
                                                    }
                                                }}
                                                className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                                                title="Copiar link"
                                                aria-label={`Copiar link do webhook de ${conn.name}`}
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-foreground text-sm whitespace-nowrap">
                                        {conn.created_at ? new Date(conn.created_at).toLocaleDateString('pt-BR') : '-'}
                                    </td>
                                    {canManageConnections && (
                                        <td className="px-6 py-4 text-center whitespace-nowrap space-x-1">
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(conn)}
                                                className="p-1.5 rounded-md text-foreground hover:text-primary transition-colors inline-block"
                                                title="Editar conexão"
                                                aria-label={`Editar conexão ${conn.name}`}
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(conn)}
                                                className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors inline-block"
                                                title="Excluir conexão"
                                                aria-label={`Excluir conexão ${conn.name}`}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                    </tbody>
                </table>
                </div>
            </div>
            )}

            <UnnichatConnectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchConnections}
                connection={selectedConnection}
            />
        </div>
    );
};
