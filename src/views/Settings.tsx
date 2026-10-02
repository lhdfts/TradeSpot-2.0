import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '../components/ui/button';
import { api } from '../services/api';
import { toastManager } from '../components/ui/toast';

/** Configurações do sistema que antes exigiriam mudar o código. Admin e Dev. */
export const Settings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [available, setAvailable] = useState<string[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [saved, setSaved] = useState<string[]>([]);

    useEffect(() => {
        api.settings.getOwnerChangeSectors()
            .then(r => {
                setAvailable(r.availableSectors);
                setSelected(r.sectors);
                setSaved(r.sectors);
            })
            .catch(() => toastManager.add({ title: 'Erro', description: 'Não foi possível carregar as configurações.', type: 'error' }))
            .finally(() => setLoading(false));
    }, []);

    const toggle = (sector: string) =>
        setSelected(prev => prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]);

    const isDirty = selected.length !== saved.length || selected.some(s => !saved.includes(s));

    const handleSave = async () => {
        setSaving(true);
        try {
            const r = await api.settings.updateOwnerChangeSectors(selected);
            setSaved(r.sectors);
            setSelected(r.sectors);
            toastManager.add({ title: 'Configurações salvas', description: 'Setores com troca de responsável atualizados.', type: 'success' });
        } catch (err: any) {
            toastManager.add({ title: 'Erro', description: err?.message || 'Não foi possível salvar.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-6">
            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm space-y-4">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Troca de responsável</h3>
                    <p className="text-sm text-secondary mt-1">
                        Nos setores marcados, o Líder pode trocar o responsável (quem recebe a comissão) dos agendamentos criados pela equipe dele.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-6"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {available.map(sector => (
                            <label key={sector} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border cursor-pointer hover:bg-muted/40">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-primary"
                                    checked={selected.includes(sector)}
                                    onChange={() => toggle(sector)}
                                />
                                <span className="text-sm text-foreground">{sector}</span>
                            </label>
                        ))}
                    </div>
                )}

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={loading || saving || !isDirty}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        <span className="ml-2">Salvar</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};
