import { cn } from '../../lib/utils';
import { getStatusColor } from '../../lib/appointmentStatus';

// Cores vêm de lib/appointmentStatus.ts (fonte única); o ponto repete a cor do texto.
// O ponto pulsa só no que está acontecendo agora.
const PULSING = new Set(['Iniciando', 'Ao Vivo']);

/** Selo de status com ponto colorido; "Iniciando" e "Ao Vivo" pulsam. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = getStatusColor(status);
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
