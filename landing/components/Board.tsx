'use client';

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { PEOPLE, SLOTS, STATUS_LABEL, type BoardEvent, type Status } from '@/lib/data';

const STATUS_STYLE: Record<Status, string> = {
  pendente: 'bg-paper text-ink border border-ink/80',
  realizado: 'bg-blue text-paper border border-blue',
  noshow: 'bg-ink text-paper border border-ink',
  reagendado: 'bg-blue-soft text-blue-deep border-2 border-dashed border-blue',
};

function StatusIcon({ status }: { status: Status }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3 shrink-0">
      {status === 'pendente' && <circle cx="8" cy="8" r="5.5" {...common} />}
      {status === 'realizado' && <path d="M3 8.5l3 3 7-7" {...common} />}
      {status === 'noshow' && <path d="M4 4l8 8M12 4l-8 8" {...common} />}
      {status === 'reagendado' && <path d="M12.5 6A5 5 0 1 0 13 9.5M13 2.5V6H9.5" {...common} />}
    </svg>
  );
}

/** Quadro da tarde: linhas por atendente, colunas de 30 minutos. */
export function Board({ events, caption, compact = false }: { events: BoardEvent[]; caption: string; compact?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <figure className="overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-[0_40px_80px_-40px_rgb(10_10_11/0.35)]">
      <div className="flex items-center justify-between gap-4 border-b border-ink/10 px-5 py-4">
        <div>
          <p className="font-display text-base font-bold tracking-tight">Closer · quarta, 18</p>
          <p className="font-mono text-xs text-graphite">14:00 às 18:00</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-paper">
          <span className="size-1.5 animate-pulse rounded-full bg-[#7d97ff]" aria-hidden="true" />
          Ao vivo
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className={compact ? 'min-w-[720px]' : 'min-w-[640px]'}>
          <div className="grid grid-cols-[96px_repeat(8,minmax(0,1fr))] border-b border-ink/10 font-mono text-[11px] text-graphite">
            <span className="px-4 py-2">Atendente</span>
            {SLOTS.map((s) => (
              <span key={s} className="border-l border-ink/5 px-1.5 py-2">
                {s}
              </span>
            ))}
          </div>
          <LayoutGroup>
            {PEOPLE.map((p) => (
              <div key={p.id} className="relative grid grid-cols-[96px_repeat(8,minmax(0,1fr))] border-b border-ink/5 last:border-b-0">
                <span className={`flex items-center px-4 font-display text-sm font-bold ${compact ? 'h-16' : 'h-20'}`}>{p.name.split(' ')[0]}</span>
                {SLOTS.map((s, i) => (
                  <span key={s} className="border-l border-ink/5" style={{ gridColumn: i + 2, gridRow: 1 }} />
                ))}
                {p.offFrom !== undefined && (
                  <span
                    className="hatch m-2 flex items-center justify-center rounded-xl border border-ink/10 font-mono text-[11px] text-graphite"
                    style={{ gridColumn: `${p.offFrom + 2} / -1`, gridRow: 1 }}
                  >
                    Fora da escala
                  </span>
                )}
                <AnimatePresence>
                  {events
                    .filter((e) => e.person === p.id)
                    .map((e) => (
                      <motion.span
                        key={e.id}
                        layout={!reduce}
                        initial={e.fresh && !reduce ? { opacity: 0, y: -28, scale: 0.85 } : false}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        className={`relative z-10 m-1.5 flex min-w-0 flex-col justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors duration-500 ${STATUS_STYLE[e.status]} ${
                          e.fresh ? 'ring-4 ring-blue/25' : ''
                        }`}
                        style={{ gridColumn: e.slot + 2, gridRow: 1 }}
                      >
                        <span className="truncate text-[12px] font-bold leading-4">{e.lead}</span>
                        <span className="flex items-center gap-1 text-[10px] font-medium leading-3 opacity-90">
                          <StatusIcon status={e.status} />
                          <span className="sr-only">{STATUS_LABEL[e.status]}</span>
                        </span>
                      </motion.span>
                    ))}
                </AnimatePresence>
              </div>
            ))}
          </LayoutGroup>
        </div>
      </div>

      <ul aria-hidden="true" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-ink/10 px-5 py-3 text-[11px] font-medium text-graphite">
        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={`grid size-5 place-items-center rounded-md ${STATUS_STYLE[s]}`}>
              <StatusIcon status={s} />
            </span>
            {STATUS_LABEL[s]}
          </li>
        ))}
      </ul>
      <figcaption aria-live="polite" className="flex items-center gap-3 bg-ink px-5 py-4 text-sm font-medium text-paper">
        <span className="size-2 shrink-0 rounded-full bg-blue" aria-hidden="true" />
        {caption}
      </figcaption>
    </figure>
  );
}
