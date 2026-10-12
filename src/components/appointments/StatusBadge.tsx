import { cn } from '../../lib/utils';

// Cores dos status (as mesmas de antes); o ponto repete a cor do texto.
const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  Realizado: { badge: 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/20', dot: 'bg-[#00E676]' },
  Pendente: { badge: 'bg-[#B2B2B2]/10 text-[#B2B2B2] border-[#B2B2B2]/20', dot: 'bg-[#B2B2B2]' },
  Cancelado: { badge: 'bg-[#FF1744]/10 text-[#FF1744] border-[#FF1744]/20', dot: 'bg-[#FF1744]' },
  Reagendado: { badge: 'bg-[#2979FF]/10 text-[#2979FF] border-[#2979FF]/20', dot: 'bg-[#2979FF]' },
  Esquecimento: { badge: 'bg-[#D500F9]/10 text-[#D500F9] border-[#D500F9]/20', dot: 'bg-[#D500F9]' },
  'No-show': { badge: 'bg-[#FF9100]/10 text-[#FF9100] border-[#FF9100]/20', dot: 'bg-[#FF9100]' },
  // Só do front (ver lib/appointmentStatus.ts): no banco continuam "Pendente".
  Iniciando: { badge: 'bg-[#FFC400]/10 text-[#FFC400] border-[#FFC400]/30', dot: 'bg-[#FFC400]' },
  // Vermelho sólido (e não o tom claro do Cancelado) para não confundir os dois.
  'Ao Vivo': { badge: 'bg-[#FF1744] text-white border-[#FF1744]', dot: 'bg-white' },
};

// O ponto pulsa só no que está acontecendo agora.
const PULSING = new Set(['Iniciando', 'Ao Vivo']);
const FALLBACK = { badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20', dot: 'bg-gray-400' };

/** Selo de status com ponto colorido; "Iniciando" e "Ao Vivo" pulsam. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = STATUS_STYLES[status] ?? FALLBACK;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap',
        style.badge,
        className
      )}
    >
      <span className="relative flex size-1.5">
        {PULSING.has(status) && (
          <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping motion-reduce:animate-none', style.dot)} />
        )}
        <span className={cn('relative inline-flex size-1.5 rounded-full', style.dot)} />
      </span>
      {status}
    </span>
  );
}
