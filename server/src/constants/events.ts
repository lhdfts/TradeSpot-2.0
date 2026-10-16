// Eventos da Aldeia em que a própria Aldeia marca a reunião com um Closer
// escolhido por ela (Colaborador ou Co-líder do setor Closer), em vez da
// distribuição automática restrita ao setor do evento.
export const ACTION_14_DIAS_EVENT_ID = '81fc2528-e0be-4240-a5b0-05c1a0b8986a';
export const ALDEIA_TEMPORARIO_7_DIAS_EVENT_ID = '713ebae3-f877-4bdf-bdfa-801d995e937a';

export const ALDEIA_TO_CLOSER_EVENT_IDS = [ACTION_14_DIAS_EVENT_ID, ALDEIA_TEMPORARIO_7_DIAS_EVENT_ID];
export const ALDEIA_TO_CLOSER_TYPES = ['Ligação Closer', 'Reagendamento Closer'];

/** Agendamento da Aldeia para um Closer escolhido (evento + tipo da lista acima)? */
export const isAldeiaToCloser = (eventId?: string | null, type?: string | null): boolean =>
    !!eventId && !!type && ALDEIA_TO_CLOSER_EVENT_IDS.includes(eventId) && ALDEIA_TO_CLOSER_TYPES.includes(type);
