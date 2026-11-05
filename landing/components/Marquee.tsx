const WORDS = ['Escala', 'Distribuição', 'Lembretes', 'No show', 'Reagendado', 'Eventos', 'Métricas', 'Logs'];

function Row() {
  return (
    <ul className="flex shrink-0 items-center gap-10 pr-10" aria-hidden="true">
      {WORDS.map((w) => (
        <li key={w} className="flex items-center gap-10 font-display text-[clamp(40px,6vw,96px)] font-black uppercase leading-none tracking-[-0.04em]">
          {w}
          <svg viewBox="0 0 24 24" className="size-[0.45em] shrink-0">
            <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M8 12.5l2.6 2.6L16 9.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </li>
      ))}
    </ul>
  );
}

export function Marquee() {
  return (
    <section aria-label="Recursos" className="grain grain-light on-blue relative overflow-hidden bg-blue py-8 text-paper sm:py-10">
      <p className="sr-only">{WORDS.join(', ')}.</p>
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
        <Row />
        <Row />
      </div>
    </section>
  );
}
