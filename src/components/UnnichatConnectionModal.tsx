import React, { useState, useEffect } from 'react';
import { Modal } from './ui/modal';
import { Input as BaseInput } from './ui/input';
import { CustomSelect } from './CustomSelect';
import { Button } from './ui/button';
import type { UnnichatConnection } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Input: React.FC<any> = ({ label, ...props }) => (
    <div className="space-y-1">
        {label && <label className="block text-sm font-medium text-secondary">{label}</label>}
        <BaseInput {...props} />
    </div>
);

const Select = CustomSelect;

const SECTOR_OPTIONS = [
    { value: 'Aldeia', label: 'Aldeia' },
    { value: 'Closer', label: 'Closer' },
    { value: 'Perpétuos', label: 'Perpétuos' },
    { value: 'CEO', label: 'CEO' },
    { value: 'SDR', label: 'SDR' },
    { value: 'Tribo', label: 'Tribo' },
    { value: 'Social Seller', label: 'Social Seller' }
];

interface UnnichatConnectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    connection?: UnnichatConnection | null;
}

export const UnnichatConnectionModal: React.FC<UnnichatConnectionModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    connection
}) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState<Partial<UnnichatConnection>>({
        name: '',
        unnichat_url: '',
        sector: ''
    });
    const [saving, setSaving] = useState(false);

    const isSuperUser = user?.role === 'Admin' || user?.role === 'Dev' || user?.role === 'Qualidade' || user?.sector === 'TEI';

    useEffect(() => {
        if (connection) {
            setFormData(connection);
        } else {
            const initialSector = isSuperUser ? '' : (user?.sector || '');
            setFormData({
                name: '',
                unnichat_url: '',
                sector: initialSector
            });
        }
    }, [connection, isOpen, user, isSuperUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name?.trim() || !formData.unnichat_url?.trim()) {
            alert('Por favor, preencha o Nome da Conexão e o Link do Webhook.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: formData.name.trim(),
                unnichat_url: formData.unnichat_url.trim(),
                sector: isSuperUser ? (formData.sector || undefined) : (user?.sector || undefined)
            };

            if (connection) {
                await api.unnichatConnections.update(connection.id, payload);
            } else {
                await api.unnichatConnections.create(payload);
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Failed to save unnichat connection', error);
            alert(error.message || 'Erro ao salvar conexão unnichat.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={connection ? 'Editar Conexão Unnichat' : 'Nova Conexão Unnichat'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Nome da Conexão"
                    value={formData.name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ex: Webhook Unnichat SDR Principal"
                    className="text-foreground"
                />

                <Input
                    label="Link do Webhook"
                    value={formData.unnichat_url || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, unnichat_url: e.target.value })}
                    required
                    placeholder="https://app.unnichat.com.br/api/..."
                    className="text-foreground"
                />

                <Select
                    label="Setor"
                    value={formData.sector || ''}
                    onChange={(e: any) => setFormData({ ...formData, sector: e.target.value })}
                    options={[
                        { value: '', label: 'Selecione o Setor' },
                        ...SECTOR_OPTIONS
                    ]}
                    disabled={!isSuperUser}
                />

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
