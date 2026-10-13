// Opções do filtro "Status" das listas de agendamentos. O filtro compara com o
// status exibido (lib/appointmentStatus.ts), então "Iniciando" e "Ao Vivo"
// funcionam como os demais, e "Pendente" traz só os que ainda não começaram.
export const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: 'Todos' },
    { value: 'Ao Vivo', label: 'Ao Vivo' },
    { value: 'Cancelado', label: 'Cancelado' },
    { value: 'Esquecimento', label: 'Esquecimento' },
    { value: 'Iniciando', label: 'Iniciando' },
    { value: 'No-show', label: 'No-show' },
    { value: 'Pendente', label: 'Pendente' },
    { value: 'Realizado', label: 'Realizado' },
    { value: 'Reagendado', label: 'Reagendado' },
];

// Largura dos filtros. A partir de sm é fixa (o select não muda de tamanho com
// a opção escolhida); no celular os filtros dividem a linha em partes iguais.
export const FILTER_WIDTH = 'flex-1 basis-[140px] sm:flex-none sm:basis-auto sm:w-40';
