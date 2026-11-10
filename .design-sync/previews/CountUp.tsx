import { CountUp } from '@tradespot/ui';

// duration curta: a captura pega o valor final, não o início da contagem.
export const Metrica = () => (
  <div className="rounded-lg border border-border bg-card p-4" style={{ width: 220 }}>
    <p className="text-sm text-muted-foreground">Agendamentos no mês</p>
    <CountUp value={1284} duration={1} className="text-3xl font-bold text-foreground" />
  </div>
);

export const Percentual = () => (
  <div className="rounded-lg border border-border bg-card p-4" style={{ width: 220 }}>
    <p className="text-sm text-muted-foreground">Taxa de comparecimento</p>
    <CountUp value={87} duration={1} format={(n) => `${Math.round(n)}%`} className="text-3xl font-bold text-status-realizado" />
  </div>
);
