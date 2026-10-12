// Datas de agendamento chegam como "YYYY-MM-DD" (dia no fuso de Brasília).

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Hoje no fuso de Brasília, como "YYYY-MM-DD". */
export function brazilTodayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Data "YYYY-MM-DD" em Brasília (UTC-3 fixo, sem horário de verão) de um instante. */
export function brazilDateISO(ms: number): string {
  return new Date(ms - 3 * 3_600_000).toISOString().slice(0, 10);
}

/** Instante (ms) em que o agendamento começa; data e hora são gravadas em Brasília. */
export function appointmentStart(date: string, time: string): number {
  return Date.parse(`${date}T${time}:00-03:00`);
}

function toNoon(iso: string): Date {
  return new Date(iso + 'T12:00:00');
}

export function formatDateBR(iso: string): string {
  return toNoon(iso).toLocaleDateString('pt-BR');
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS[toNoon(iso).getDay()];
}

/** "Hoje", "Amanhã" ou "Ontem" quando a data é vizinha de hoje; senão null. */
export function relativeDayLabel(iso: string): 'Hoje' | 'Amanhã' | 'Ontem' | null {
  const diff = Math.round((toNoon(iso).getTime() - toNoon(brazilTodayISO()).getTime()) / 86_400_000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  return null;
}

/** Clique numa linha abre os detalhes, exceto quando o usuário está selecionando texto. */
export function openUnlessSelecting(open: () => void) {
  return () => {
    if (window.getSelection()?.toString()) return;
    open();
  };
}
