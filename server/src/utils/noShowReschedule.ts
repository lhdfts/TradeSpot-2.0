import { supabase } from './supabaseClient.js';

/**
 * Quando um aluno ganha um novo agendamento e o ÚLTIMO agendamento dele (o mais
 * recente por data e hora, sem contar o que acabou de ser criado) está como
 * No-show, esse No-show passa para Reagendado.
 *
 * Não mexe em status_edit_count (o limite de edições manuais do Closer) e não
 * dispara o webhook de atualização: é uma consequência do novo agendamento, que
 * já dispara o próprio webhook. Uma falha aqui é só registrada: o novo
 * agendamento já foi gravado e não deve ser desfeito por isso.
 */
export const rescheduleLastNoShow = async (
    clientId: string,
    newAppointmentId: string,
    updatedBy?: string | null
): Promise<void> => {
    try {
        const { data: last, error } = await supabase
            .from('appointments')
            .select('id, status')
            .eq('client_id', clientId)
            .neq('id', newAppointmentId)
            .order('date', { ascending: false })
            .order('time', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw new Error(error.message);
        if (!last || last.status !== 'No-show') return;

        const updatePayload: Record<string, unknown> = {
            status: 'Reagendado',
            oldStatus: 'No-show',
            updatedAt: new Date().toISOString()
        };
        if (updatedBy) updatePayload.updatedBy = updatedBy;

        const { error: updateError } = await supabase
            .from('appointments')
            .update(updatePayload)
            .eq('id', last.id)
            .eq('status', 'No-show'); // não sobrescreve se alguém mudou o status nesse meio-tempo
        if (updateError) throw new Error(updateError.message);

        console.log(`[NO-SHOW] Agendamento ${last.id} passou de No-show para Reagendado (novo agendamento ${newAppointmentId}).`);
    } catch (err: any) {
        console.error('[NO-SHOW] Falha ao passar o último No-show para Reagendado:', err?.message);
    }
};
