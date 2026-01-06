export const getAppointmentWebhooks = (): Record<string, string> => ({
    'Ligação SDR': process.env.WEBHOOK_LIGACAO_SDR || '',
    'Ligação Closer': process.env.WEBHOOK_LIGACAO_CLOSER || '',
    'Agendamento Pessoal': process.env.WEBHOOK_AGENDAMENTO_PESSOAL || '',
    'Reagendamento Closer': process.env.WEBHOOK_REAGENDAMENTO_CLOSER || '',
    'Upgrade': process.env.WEBHOOK_UPGRADE || ''
});

export const getUpdateWebhook = (): string => {
    return process.env.APPOINTMENT_UPDATE_WEBHOOK_URL || '';
};
