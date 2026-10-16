import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatDateBR, relativeDayLabel, weekdayShort } from '../../lib/dates';
import { toastManager } from '../ui/toast';

function RelativeDayChip({ date }: { date: string }) {
  const relative = relativeDayLabel(date);
  if (!relative) return null;
  return (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide leading-none',
        relative === 'Hoje' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
      )}
    >
      {relative}
    </span>
  );
}

/** Data com dia da semana e selo "Hoje"/"Amanhã"/"Ontem". `inline` para cards. */
export function AppointmentDate({ date, time, inline }: { date: string; time: string; inline?: boolean }) {
  if (inline) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2 text-foreground tabular-nums">
        {formatDateBR(date)} • {time}
        <RelativeDayChip date={date} />
      </span>
    );
  }
  return (
    // O selo ocupa o lugar do dia da semana: a célula mantém a mesma largura e altura.
    <div>
      <div className="text-foreground font-medium tabular-nums">{formatDateBR(date)}</div>
      <div className="h-5 flex items-center gap-1.5 text-sm text-secondary tabular-nums">
        {relativeDayLabel(date) ? <RelativeDayChip date={date} /> : <span className="capitalize">{weekdayShort(date)}</span>}
        <span>· {time}</span>
      </div>
    </div>
  );
}

/** Copia só os dígitos do telefone; visível sem hover e alcançável por teclado. */
export function CopyPhoneButton({ phone, size = 12 }: { phone: number | string; size?: number }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // a linha inteira abre os detalhes
    try {
      await navigator.clipboard.writeText(phone.toString().replace(/\D/g, ''));
      setCopied(true);
      toastManager.add({ title: 'Sucesso', description: 'Telefone copiado com sucesso!', type: 'success' });
    } catch {
      toastManager.add({ title: 'Erro', description: 'Falha ao copiar telefone. Tente manualmente.', type: 'error' });
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'inline-flex items-center justify-center rounded p-1 -m-1 transition-all',
        'hover:bg-foreground/10 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        copied ? 'text-green-500 opacity-100' : 'text-foreground opacity-50 group-hover:opacity-100'
      )}
      title="Copiar telefone"
      aria-label={copied ? 'Telefone copiado' : 'Copiar telefone'}
    >
      {copied ? <Check size={size} className="animate-in zoom-in-50 duration-200" /> : <Copy size={size} />}
    </button>
  );
}

/** Nome do aluno (reticências por CSS, nome completo no title) e telefone. */
export function LeadCell({ lead, phone }: { lead: string; phone: number | string }) {
  return (
    <div className="min-w-0">
      <div className="text-foreground font-medium truncate" title={lead}>
        {lead}
      </div>
      <div className="flex items-center gap-2 text-sm text-secondary tabular-nums">
        {phone}
        <CopyPhoneButton phone={phone} />
      </div>
    </div>
  );
}
