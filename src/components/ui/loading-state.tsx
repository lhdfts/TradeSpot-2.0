import { cn } from '../../lib/utils';

interface LoadingStateProps {
  /** Quantidade de linhas de esqueleto. */
  rows?: number;
  label?: string;
  className?: string;
}

/** Esqueleto de carregamento (barra de filtros + linhas) no lugar do texto "Carregando...". */
export function LoadingState({ rows = 5, label = 'Carregando...', className }: LoadingStateProps) {
  return (
    <div className={cn('space-y-4 animate-fade-up', className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="h-10 w-1/3 rounded-lg bg-muted/60 animate-shimmer" />
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-b-0">
            <div className="h-4 w-24 rounded bg-muted/60 animate-shimmer" style={{ animationDelay: `${i * 120}ms` }} />
            <div className="h-4 flex-1 rounded bg-muted/60 animate-shimmer" style={{ animationDelay: `${i * 120 + 60}ms` }} />
            <div className="h-4 w-16 rounded bg-muted/60 animate-shimmer" style={{ animationDelay: `${i * 120 + 120}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
