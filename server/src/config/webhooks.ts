export const getAppointmentWebhooks = (): Record<string, string> => ({
    'Ligação SDR': process.env.WEBHOOK_LIGACAO_SDR || '',
    'Ligação Closer': process.env.WEBHOOK_LIGACAO_CLOSER || '',
    'Ligação Equipe Aldeia': process.env.WEBHOOK_LIGACAO_EQUIPE_ALDEIA || 'https://n8n.tradestars.com.br/webhook/30c1f52e-fd8c-400b-9a19-9461ce3635cc',
    'Agendamento Pessoal': process.env.WEBHOOK_AGENDAMENTO_PESSOAL || '',
    'Reagendamento Closer': process.env.WEBHOOK_REAGENDAMENTO_CLOSER || '',
    'Upgrade': process.env.WEBHOOK_UPGRADE || '',
    'Gold Call': process.env.WEBHOOK_GOLD_CALL || '',
    'Fora da agenda': process.env.WEBHOOK_FORA_DA_AGENDA || '',
    'Onboarding': process.env.WEBHOOK_ONBOARDING || '',
    'Fechamento': process.env.WEBHOOK_ATEND_DE_FECHAMENTO || ''
});

export const getUpdateWebhook = (): string => {
    return process.env.APPOINTMENT_UPDATE_WEBHOOK_URL || '';
};
