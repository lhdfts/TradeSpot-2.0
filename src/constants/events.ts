// Mesma lista de server/src/constants/events.ts — manter as duas iguais.
// Eventos da Aldeia em que a própria Aldeia marca a reunião com um Closer
// escolhido por ela (Colaborador ou Co-líder do setor Closer).
export const ACTION_14_DIAS_EVENT_ID = '81fc2528-e0be-4240-a5b0-05c1a0b8986a';
export const ALDEIA_TEMPORARIO_7_DIAS_EVENT_ID = '713ebae3-f877-4bdf-bdfa-801d995e937a';

export const ALDEIA_TO_CLOSER_EVENT_IDS = [ACTION_14_DIAS_EVENT_ID, ALDEIA_TEMPORARIO_7_DIAS_EVENT_ID];
export const ALDEIA_TO_CLOSER_TYPES = ['Ligação Closer', 'Reagendamento Closer'];

export const isAldeiaToCloserEvent = (eventId?: string | null): boolean =>
    !!eventId && ALDEIA_TO_CLOSER_EVENT_IDS.includes(eventId);

export const isAldeiaToCloser = (eventId?: string | null, type?: string | null): boolean =>
    isAldeiaToCloserEvent(eventId) && !!type && ALDEIA_TO_CLOSER_TYPES.includes(type);
