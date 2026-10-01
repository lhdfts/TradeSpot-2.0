import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, UserCheck } from 'lucide-react';
import { Button } from './ui/button';
import { FloatingSelect } from './FloatingSelect';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { toastManager } from './ui/toast';
import { normalizeSector } from '../constants/sectors';
import type { Appointment, Attendant } from '../types';

interface AppointmentOwnerFieldProps {
    appointment: Appointment;
    attendants: Attendant[];
}

const formatDateTime = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

/**
 * Criador e owner do agendamento. O owner recebe a comissão; o criador nunca
 * muda. Só o Líder do setor do criador troca o owner, e só nos setores
 * habilitados em Configurações. O backend valida as mesmas regras.
 */
export const AppointmentOwnerField: React.FC<AppointmentOwnerFieldProps> = ({ appointment, attendants }) => {
    const { user } = useAuth();
    const { changeOwner } = useAppointments();

    const creatorId = appointment.createdBy;
    const creator = attendants.find(a => a.id === creatorId);
    const creatorSector = normalizeSector(creator?.sector);

    const [ownerId, setOwnerId] = useState(appointment.ownerId ?? creatorId ?? '');
    const [ownerChangedAt, setOwnerChangedAt] = useState(appointment.ownerChangedAt);
    const [selected, setSelected] = useState(ownerId);
    const [enabledSectors, setEnabledSectors] = useState<string[] | null>(null);
    const [saving, setSaving] = useState(false);

    const isSectorLeader = !!user && user.role === 'Líder' && !!creatorSector && normalizeSector(user.sector) === creatorSector;

    useEffect(() => {
        if (!isSectorLeader) return;
        api.settings.getOwnerChangeSectors()
            .then(r => setEnabledSectors(r.sectors))
            .catch(() => setEnabledSectors([]));
    }, [isSectorLeader]);

    const canChange = isSectorLeader && !!enabledSectors?.includes(creatorSector!);

    const candidates = useMemo(() => {
        if (!canChange) return [];
        const list = attendants.filter(a =>
            normalizeSector(a.sector) === creatorSector && ['Colaborador', 'Co-líder'].includes(a.role));
        // O criador sempre aparece, para ser possível desfazer a troca.
        if (creator && !list.some(a => a.id === creator.id)) list.push(creator);
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [canChange, attendants, creatorSector, creator]);

    const nameOf = (id?: string) => (id && attendants.find(a => a.id === id)?.name) || appointment.ownerName || '-';
    const ownerDiffers = !!creatorId && ownerId !== creatorId;

    const handleSave = async () => {
        if (!selected || selected === ownerId) return;
        setSaving(true);
        try {
            await changeOwner(appointment.id, selected);
            setOwnerId(selected);
            setOwnerChangedAt(new Date().toISOString());
            toastManager.add({ title: 'Owner alterado', description: `Agora o owner é ${nameOf(selected)}.`, type: 'success' });
        } catch (err: any) {
            toastManager.add({ title: 'Erro', description: err?.message || 'Não foi possível trocar o owner.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="col-span-1 md:col-span-2 rounded-lg border border-border p-3 space-y-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-muted-foreground">
                    Criado por: <span className="text-foreground font-medium">{creator?.name || '-'}</span>
                </span>
                <span className="text-muted-foreground">
                    Owner: <span className="text-foreground font-medium">{nameOf(ownerId)}</span>
                    {ownerDiffers && ownerChangedAt && (
                        <span className="text-xs"> (alterado em {formatDateTime(ownerChangedAt)})</span>
                    )}
                </span>
            </div>

            {canChange && (
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1">
                        <FloatingSelect
                            label="Trocar owner"
                            value={selected}
                            onChange={(e) => setSelected(e.target.value)}
                            options={candidates.map(a => ({
                                value: a.id,
                                label: a.id === creatorId ? `${a.name} (criador)` : a.name
                            }))}
                            disabled={saving}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleSave}
                        disabled={saving || !selected || selected === ownerId}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                        <span className="ml-2">Salvar owner</span>
                    </Button>
                </div>
            )}
        </div>
    );
};
