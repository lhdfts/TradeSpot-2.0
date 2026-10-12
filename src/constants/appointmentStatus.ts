// Opções do filtro "Status" das listas de agendamentos.
export const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: 'Todos' },
    { value: 'Cancelado', label: 'Cancelado' },
    { value: 'Esquecimento', label: 'Esquecimento' },
    { value: 'No-show', label: 'No-show' },
    { value: 'Pendente', label: 'Pendente' },
    { value: 'Realizado', label: 'Realizado' },
    { value: 'Reagendado', label: 'Reagendado' },
];

// Largura fixa dos filtros: o select não muda de tamanho com a opção escolhida.
export const FILTER_WIDTH = 'w-40';
