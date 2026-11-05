// Configuração editável da página: preços, links de pagamento, módulos e perguntas.

export type Currency = 'BRL' | 'USD';
export type Billing = 'anual' | 'mensal';
export type PlanId = 'gratis' | 'essencial' | 'equipes';

// Preço por usuário por mês. USD segue a referência de mercado + US$ 2; BRL = USD × 5,40 arredondado.
export const PRICES: Record<PlanId, Record<Currency, Record<Billing, number>>> = {
  gratis: { BRL: { anual: 0, mensal: 0 }, USD: { anual: 0, mensal: 0 } },
  essencial: { BRL: { anual: 65, mensal: 76 }, USD: { anual: 12, mensal: 14 } },
  equipes: { BRL: { anual: 97, mensal: 119 }, USD: { anual: 18, mensal: 22 } },
};

// Cole aqui os links do checkout (Stripe, Mercado Pago, Asaas...). Vazio = aviso de "link não configurado".
export const PAYMENT_URLS: Record<PlanId, string> = { gratis: '', essencial: '', equipes: '' };

export const DEMO_URL = '';

export const PLANS: {
  id: PlanId;
  name: string;
  pitch: string;
  badge?: string;
  features: string[];
  maxSeats?: number;
}[] = [
  {
    id: 'gratis',
    name: 'Grátis',
    pitch: 'Para testar com um atendente.',
    maxSeats: 1,
    features: ['1 atendente', 'Agenda pública com link', 'Escala semanal', 'Status Pendente, Realizado e No show'],
  },
  {
    id: 'essencial',
    name: 'Essencial',
    pitch: 'Para o time que já vive de agenda.',
    badge: 'Mais escolhido',
    features: ['Tudo do Grátis', 'Distribuição automática', 'Reagendamento em um clique', 'Lembretes no navegador', 'Eventos com agenda própria'],
  },
  {
    id: 'equipes',
    name: 'Equipes',
    pitch: 'Para vários setores e líderes.',
    badge: 'Recomendado',
    features: ['Tudo do Essencial', 'Setores e líderes', 'Métricas por atendente e setor', 'Logs de alteração', 'Integração Unnichat'],
  },
];

export const MODULES = [
  { id: 'agenda', name: 'Agenda pública', line: 'Um link para o lead escolher o horário. Só aparecem horários com alguém livre.', plan: 'Grátis', tone: 'blue' },
  { id: 'distribuicao', name: 'Distribuição automática', line: 'Quem está na escala, sem conflito e com menos ligações recebe o lead.', plan: 'Essencial', tone: 'ink' },
  { id: 'lembretes', name: 'Lembretes', line: 'Aviso no navegador antes de cada ligação, para ninguém perder o horário.', plan: 'Essencial', tone: 'paper' },
  { id: 'noshow', name: 'No show e retorno', line: 'Marque no show com um clique. O novo horário já entra como Reagendado.', plan: 'Essencial', tone: 'blue' },
  { id: 'eventos', name: 'Eventos', line: 'Agendas por evento, com horários e setores próprios.', plan: 'Essencial', tone: 'ink' },
  { id: 'metricas', name: 'Métricas', line: 'Realizados, no show e reagendados por atendente e por setor.', plan: 'Equipes', tone: 'paper' },
  { id: 'logs', name: 'Logs', line: 'Quem mudou o quê, e quando. Sem discussão no grupo.', plan: 'Equipes', tone: 'blue' },
] as const;

export type ModuleTone = (typeof MODULES)[number]['tone'];

export const FAQS = [
  { q: 'Preciso instalar alguma coisa?', a: 'Não. O Spot roda no navegador. Seu time entra com a conta Google da empresa.' },
  { q: 'Como o sistema escolhe quem atende?', a: 'Entre quem está na escala naquele horário e não tem outro agendamento, recebe quem tem menos ligações no dia. No empate, vale a ordem da lista do setor.' },
  { q: 'O que acontece num no show?', a: 'O atendente marca No show. Quando o mesmo lead volta a agendar, o novo horário entra como Reagendado, e as métricas mostram os dois.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim. No plano mensal você cancela a qualquer momento. No anual, o acesso segue até o fim do período pago.' },
  { q: 'Tem limite de agendamentos?', a: 'Não. Você paga por atendente, não por agendamento.' },
];

// Quadro da história: uma tarde de ligações do time Closer.
export const SLOTS = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];
export const PEOPLE = [
  { id: 'ana', name: 'Ana Lima' },
  { id: 'bruno', name: 'Bruno Reis' },
  { id: 'carla', name: 'Carla Dias' },
  { id: 'diego', name: 'Diego Melo', offFrom: 4 },
];

export type Status = 'pendente' | 'realizado' | 'noshow' | 'reagendado';
export type BoardEvent = { id: string; person: string; slot: number; lead: string; status: Status; fresh?: boolean };

const base: BoardEvent[] = [
  { id: 'e1', person: 'ana', slot: 0, lead: 'Paulo M.', status: 'pendente' },
  { id: 'e2', person: 'bruno', slot: 0, lead: 'Rita G.', status: 'pendente' },
  { id: 'e3', person: 'carla', slot: 3, lead: 'Luís P.', status: 'pendente' },
  { id: 'e4', person: 'ana', slot: 5, lead: 'Sofia A.', status: 'pendente' },
  { id: 'e5', person: 'bruno', slot: 6, lead: 'Caio N.', status: 'pendente' },
];

export const STORY: { title: string; body: string; caption: string; events: BoardEvent[] }[] = [
  {
    title: 'A escala vem primeiro.',
    body: 'Cada atendente tem seu horário e suas pausas. Fora da escala, ninguém recebe ligação. Nem por engano.',
    caption: 'Diego sai às 16:00. A agenda já sabe.',
    events: base,
  },
  {
    title: 'O lead escolhe. O sistema distribui.',
    body: 'Marina pediu 15:00. Entre quem está livre, Diego tem menos ligações na tarde. Ele recebe.',
    caption: 'Marina Souza entrou para Diego às 15:00.',
    events: [...base, { id: 'e6', person: 'diego', slot: 2, lead: 'Marina S.', status: 'pendente', fresh: true }],
  },
  {
    title: 'No show tem nome.',
    body: 'Paulo atendeu. Rita não apareceu. Um clique em cada, e a tarde fica registrada como aconteceu.',
    caption: 'Ana marcou Realizado. Bruno marcou No show.',
    events: [
      { ...base[0], status: 'realizado' },
      { ...base[1], status: 'noshow' },
      ...base.slice(2),
      { id: 'e6', person: 'diego', slot: 2, lead: 'Marina S.', status: 'pendente' },
    ],
  },
  {
    title: 'O retorno volta para a fila certa.',
    body: 'Rita agendou de novo para 16:00. Entra como Reagendado, com Carla, que estava livre e com a tarde mais leve.',
    caption: 'Rita Gomes voltou às 16:00 com Carla.',
    events: [
      { ...base[0], status: 'realizado' },
      { ...base[1], status: 'noshow' },
      ...base.slice(2),
      { id: 'e6', person: 'diego', slot: 2, lead: 'Marina S.', status: 'pendente' },
      { id: 'e7', person: 'carla', slot: 4, lead: 'Rita G.', status: 'reagendado', fresh: true },
    ],
  },
];

export const STATUS_LABEL: Record<Status, string> = {
  pendente: 'Pendente',
  realizado: 'Realizado',
  noshow: 'No show',
  reagendado: 'Reagendado',
};
