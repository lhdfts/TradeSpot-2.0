import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './ui/modal';
import { Button } from './ui/button';
import type { Attendant } from '../types';
import { api } from '../services/api';

interface ArchiveAttendantModalProps {
    attendant: Attendant | null;
    onClose: () => void;
    onSuccess: () => void;
    onViewAppointments: (attendantName: string) => void;
}

// Confirmação do arquivamento. Consulta os atendimentos pendentes ao abrir e só
// libera a confirmação quando não há nenhum (o backend repete a checagem).
export const ArchiveAttendantModal: React.FC<ArchiveAttendantModalProps> = ({ attendant, onClose, onSuccess, onViewAppointments }) => {
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [isArchiving, setIsArchiving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!attendant) return;
        let cancelled = false;
        setPendingCount(null);
        setError(null);
        api.attendants.pendingCount(attendant.id)
            .then(count => { if (!cancelled) setPendingCount(count); })
            .catch((err: unknown) => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao verificar atendimentos pendentes');
            });
        return () => { cancelled = true; };
    }, [attendant]);

    const handleConfirm = async () => {
        if (!attendant) return;
        setIsArchiving(true);
        setError(null);
        try {
            await api.attendants.archive(attendant.id);
            onSuccess();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro ao arquivar colaborador');
        } finally {
            setIsArchiving(false);
        }
    };

    const hasPending = (pendingCount ?? 0) > 0;
    const canConfirm = pendingCount === 0 && !isArchiving;

    return (
        <Modal isOpen={!!attendant} onClose={onClose} title="Arquivar Colaborador" maxWidthClass="max-w-md">
            {attendant && (
                <div className="space-y-4">
                    {pendingCount === null && !error && (
                        <p className="text-secondary text-sm">Verificando atendimentos pendentes...</p>
                    )}

                    {hasPending && (
                        <div className="flex gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-400">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <div className="space-y-2">
                                <p>
                                    <strong>{attendant.name}</strong> ainda possui <strong>{pendingCount}</strong> atendimento(s) pendente(s).
                                    Conclua ou transfira esses atendimentos antes de arquivar.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => onViewAppointments(attendant.name)}
                                    className="underline hover:text-yellow-300 transition-colors"
                                >
                                    Ver agendamentos
                                </button>
                            </div>
                        </div>
                    )}

                    {pendingCount === 0 && (
                        <div className="space-y-2 text-sm text-foreground">
                            <p>Tem certeza que deseja arquivar <strong>{attendant.name}</strong>?</p>
                            <p className="text-secondary">
                                O colaborador deixará de receber agendamentos e perderá o acesso ao sistema.
                                O setor passará a ser "Desativado" e o e-mail será alterado para{' '}
                                <span className="break-all">{attendant.email}.desativado</span>.
                            </p>
                        </div>
                    )}

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={isArchiving} className="w-full sm:w-auto h-11 sm:h-9">
                            Cancelar
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleConfirm} disabled={!canConfirm} className="w-full sm:w-auto h-11 sm:h-9">
                            {isArchiving ? 'Arquivando...' : 'Arquivar'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
