import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { FloatingDateInput } from '../components/FloatingDateInput';
import { api } from '../services/api';

export const CeoScheduler = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [times, setTimes] = useState<string[]>([]);
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        if (!user?.id) return;
        
        loadUserData();
    }, [user?.id]);

    const loadUserData = async () => {
        setLoading(true);
        try {
            // Re-fetch current user data from API to get fresh custom_dates
            const data = await api.attendants.list();
            const me = data.find((a: any) => a.id === user?.id);
            if (me) {
                setUserData(me);
                if (selectedDate && me.schedule?.custom_dates?.[selectedDate]) {
                    setTimes(me.schedule.custom_dates[selectedDate]);
                } else if (!selectedDate) {
                    const firstDateStr = new Date().toISOString().split('T')[0];
                    setSelectedDate(firstDateStr);
                    if (me.schedule?.custom_dates?.[firstDateStr]) {
                        setTimes(me.schedule.custom_dates[firstDateStr]);
                    } else {
                        setTimes([]);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load user schedule data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (date: string) => {
        setSelectedDate(date);
        
        if (userData?.schedule?.custom_dates?.[date]) {
            setTimes(userData.schedule.custom_dates[date]);
        } else {
            setTimes([]);
        }
    };

    const handleAddTime = (hourStr: string) => {
        if (!times.includes(hourStr)) {
            const newTimes = [...times, hourStr].sort();
            setTimes(newTimes);
        }
    };

    const handleRemoveTime = (hourStr: string) => {
        setTimes(times.filter(t => t !== hourStr));
    };

    const handleSave = async () => {
        if (!userData || !selectedDate) return;

        setSaving(true);
        try {
            const currentSchedule = userData.schedule || {};
            const currentCustomDates = currentSchedule.custom_dates || {};

            const newSchedule = {
                ...currentSchedule,
                custom_dates: {
                    ...currentCustomDates,
                    [selectedDate]: times
                }
            };

            await api.attendants.update(userData.id, { schedule: newSchedule });
            
            // Update local state to reflect successful save without re-fetching everything
            setUserData({ ...userData, schedule: newSchedule });
            
            alert('Horários salvos com sucesso!');
        } catch (error) {
            console.error("Error saving schedule:", error);
            alert('Erro ao salvar os horários.');
        } finally {
            setSaving(false);
        }
    };

    const PREDEFINED_HOURS = [
        '09:00', '10:00', '11:00', '12:00', 
        '13:00', '14:00', '15:00', '16:00', 
        '17:00', '18:00', '19:00', '20:00'
    ];

    if (loading) return <div className="p-8 text-center text-secondary">Carregando seus horários...</div>;

    if (user?.sector !== 'CEO') {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
                <p className="text-secondary">Você não tem permissão para acessar o gerenciamento de agenda avulsa.</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Minha Agenda</h1>
                    <p className="text-muted-foreground">Gerencie seus horários de atendimento avulsos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 font-medium border-b border-border/50 pb-3">
                            <Calendar size={18} className="text-primary" />
                            Selecione a Data
                        </div>
                        <FloatingDateInput
                            label="Data de Agendamento"
                            value={selectedDate}
                            onChange={(e: any) => handleDateChange(e.target.value)}
                            minDate={new Date()}
                        />
                    </div>
                    
                    {selectedDate && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-secondary">
                            <p>As alterações feitas nesta data afetarão imediatamente sua página pública de agendamento.</p>
                        </div>
                    )}
                </div>

                <div className="md:col-span-2">
                    {selectedDate ? (
                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px] flex flex-col">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                                <div>
                                    <h3 className="font-semibold text-lg">Horários Disponíveis</h3>
                                    <p className="text-sm text-secondary">Para o dia {selectedDate.split('-').reverse().join('/')}</p>
                                </div>
                                <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full">
                                    {times.length} Horários
                                </span>
                            </div>

                            <div className="flex-1 space-y-6">
                                <div>
                                    <h4 className="text-sm font-medium text-foreground mb-3">Horários Adicionados</h4>
                                    {times.length === 0 ? (
                                        <div className="text-center py-8 rounded-lg border-2 border-dashed border-border/50 bg-background/50">
                                            <p className="text-sm text-secondary">Nenhum horário marcado para este dia.</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {times.sort().map(time => (
                                                <div 
                                                    key={time} 
                                                    className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-md text-sm font-medium"
                                                >
                                                    {time}
                                                    <button 
                                                        onClick={() => handleRemoveTime(time)}
                                                        className="hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-border/50">
                                    <h4 className="text-sm font-medium text-foreground mb-3">Adicionar Horário</h4>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                        {PREDEFINED_HOURS.map(hour => (
                                            <button
                                                key={hour}
                                                type="button"
                                                disabled={times.includes(hour)}
                                                onClick={() => handleAddTime(hour)}
                                                className={`py-2 text-sm rounded-md border font-medium transition-all ${
                                                    times.includes(hour) 
                                                        ? 'bg-muted border-transparent text-muted-foreground opacity-50 cursor-not-allowed'
                                                        : 'bg-background border-border hover:border-primary hover:text-primary'
                                                }`}
                                            >
                                                {hour}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="mt-4 flex gap-2 items-end">
                                        <div className="flex-1">
                                            <label className="text-xs font-medium text-secondary mb-1 block">Outro horário:</label>
                                            <input 
                                                type="time" 
                                                id="custom-time-input"
                                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                                            />
                                        </div>
                                        <Button 
                                            variant="secondary"
                                            onClick={() => {
                                                const input = document.getElementById('custom-time-input') as HTMLInputElement;
                                                if (input && input.value) {
                                                    handleAddTime(input.value);
                                                    input.value = '';
                                                }
                                            }}
                                        >
                                            Adicionar
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-4 border-t border-border/50 flex justify-end">
                                <Button onClick={handleSave} disabled={saving} className="px-8 w-full md:w-auto">
                                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px] flex items-center justify-center text-center">
                            <div className="max-w-xs space-y-3">
                                <Calendar size={48} className="mx-auto text-primary/20" />
                                <h3 className="font-medium text-lg">Selecione uma Data</h3>
                                <p className="text-sm text-secondary">Escolha um dia no calendário ao lado para visualizar e gerenciar seus horários de atendimento.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
