// Lembrete 5 minutos antes dos agendamentos em que o usuário logado é o
// atendente (só status Pendente). Usa a Notification API do navegador; sem
// permissão, cai para um toast dentro do sistema.
//
// Os agendamentos começam sempre em :00, :15, :30 ou :45. Por isso o hook não
// fica consultando: dorme até 5 minutos antes do próximo horário (:55, :10,
// :25, :40), faz UMA consulta só daquele horário e só do próprio atendente,
// e agenda a seguinte. São 4 chamadas pequenas por hora por aba aberta.
//
// Só funciona com o sistema aberto em alguma aba (não há push no servidor).

import { useEffect, useRef } from 'react';
import { api, type ReminderAppointment } from '../services/api';
import { brazilTodayISO } from '../lib/dates';
import { toastManager } from '../components/ui/toast';

const MINUTE = 60_000;
const SLOT_MS = 15 * MINUTE;
const LEAD_MS = 5 * MINUTE;
// Brasília não tem horário de verão desde 2019: UTC-3 fixo, como os formulários.
const BRT_OFFSET_MS = 3 * 60 * MINUTE;
// Espalha as consultas de todos os usuários em até 20s, em vez de todas no mesmo segundo.
const MAX_JITTER_MS = 20_000;
const STORAGE_KEY = 'tradespot:lembretes-enviados';

interface Slot {
    date: string; // YYYY-MM-DD em Brasília
    time: string; // HH:mm em Brasília
    startsAt: number; // instante (ms) em que o horário começa
}

/** Próximo horário de agendamento (:00/:15/:30/:45) depois de `now`. */
function nextSlot(now: number): Slot {
    const brtWallClock = now - BRT_OFFSET_MS; // lido com getters UTC = relógio de Brasília
    const slotWallClock = Math.floor(brtWallClock / SLOT_MS) * SLOT_MS + SLOT_MS;
    const iso = new Date(slotWallClock).toISOString(); // vira o dia sozinho na meia-noite
    return {
        date: iso.slice(0, 10),
        time: iso.slice(11, 16),
        startsAt: slotWallClock + BRT_OFFSET_MS,
    };
}

// Chave inclui data e hora: se o agendamento for remarcado, avisa de novo.
const reminderKey = (appt: ReminderAppointment) => `${appt.id}@${appt.date}T${appt.time}`;

// O registro em localStorage evita avisar duas vezes com o sistema aberto em
// várias abas ou ao recarregar a página.
function loadSent(): Set<string> {
    try {
        const today = brazilTodayISO();
        const saved: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return new Set(saved.filter(key => key.includes(`@${today}`))); // descarta dias anteriores
    } catch {
        return new Set();
    }
}

function markSent(key: string) {
    const sent = loadSent();
    sent.add(key);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...sent]));
    } catch {
        // sem localStorage: o tag da notificação ainda evita duplicar na tela
    }
}

function minutesLabel(ms: number) {
    const minutes = Math.max(1, Math.ceil(ms / MINUTE));
    return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
}

/**
 * @param onOpen chamado ao clicar numa notificação de agendamento sem link de
 *   reunião; recebe o id do agendamento.
 */
export function useMeetingReminders(userId: string | undefined, onOpen: (appointmentId: string) => void) {
    // Sempre a versão mais recente, sem reiniciar o agendamento a cada render.
    const onOpenRef = useRef(onOpen);
    useEffect(() => {
        onOpenRef.current = onOpen;
    });

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const notify = (appt: ReminderAppointment, msUntil: number) => {
            const title = `Agendamento em ${minutesLabel(msUntil)}`;
            const body = `${appt.lead} · ${appt.type} às ${appt.time}`;

            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    const notification = new Notification(title, {
                        body: `${body}\n${appt.meetLink ? 'Clique para entrar na reunião.' : 'Clique para ver os detalhes.'}`,
                        icon: `${import.meta.env.BASE_URL}logo.png`,
                        tag: appt.id, // outra aba com o mesmo aviso substitui em vez de duplicar
                        requireInteraction: true, // fica na tela até o usuário agir
                    });
                    notification.onclick = () => {
                        window.focus();
                        if (appt.meetLink) window.open(appt.meetLink, '_blank', 'noopener');
                        else onOpenRef.current(appt.id);
                        notification.close();
                    };
                    return;
                } catch {
                    // Chrome no Android não aceita o construtor (só via service worker)
                }
            }
            toastManager.add({ title, description: body, type: 'info' });
        };

        const checkSlot = async (slot: Slot) => {
            try {
                const appointments = await api.appointments.reminderSlot({ date: slot.date, time: slot.time });
                if (cancelled) return;
                const sent = loadSent();
                for (const appt of appointments) {
                    const key = reminderKey(appt);
                    if (sent.has(key)) continue;
                    markSent(key);
                    notify(appt, slot.startsAt - Date.now());
                }
            } catch (error) {
                console.error('Lembretes: falha ao buscar os agendamentos do próximo horário', error);
            }
        };

        // Cada chamada de schedule ganha um número; uma resincronização no meio
        // de uma consulta invalida a anterior, e nunca correm dois ciclos juntos.
        let generation = 0;
        // Horário já consultado: voltar à aba dentro da janela não consulta de novo.
        let checkedSlot = 0;

        const schedule = async () => {
            if (cancelled) return;
            const run = ++generation;
            const slot = nextSlot(Date.now());
            const untilReminder = slot.startsAt - LEAD_MS - Date.now();

            if (untilReminder > 0) {
                // Ainda não é hora: dorme até 5 min antes do horário.
                timer = setTimeout(schedule, untilReminder + Math.random() * MAX_JITTER_MS);
                return;
            }

            // Já dentro dos 5 minutos (hora do aviso, ou página aberta em cima da hora).
            if (checkedSlot !== slot.startsAt) {
                checkedSlot = slot.startsAt;
                await checkSlot(slot);
                if (cancelled || run !== generation) return;
            }
            // Depois que o horário começa, nextSlot já aponta para o seguinte.
            timer = setTimeout(schedule, Math.max(slot.startsAt - Date.now(), 0) + 1000);
        };

        // O timer pode atrasar com o computador suspenso; ao voltar para a aba,
        // recalcula a partir do relógio atual.
        const resync = () => {
            if (document.visibilityState !== 'visible') return;
            clearTimeout(timer);
            schedule();
        };

        schedule();
        document.addEventListener('visibilitychange', resync);
        return () => {
            cancelled = true;
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', resync);
        };
    }, [userId]);
}
