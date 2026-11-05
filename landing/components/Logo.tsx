/**
 * Marca do Spot (uso exclusivo da LP).
 *
 * Símbolo: uma grade 3×3 de horários (a escala do time) em que um dos horários
 * virou o ponto azul, maior que os outros e saltando da grade: o "spot", o lugar
 * certo que o sistema escolhe para cada lead.
 * Nome: "spot" em caixa baixa, com o "o" substituído pelo mesmo ponto azul.
 *
 * A grade usa currentColor (funciona sobre preto, branco e azul); o ponto é sempre
 * azul, exceto na versão "mono", para fundos azuis.
 */

const BLUE = '#1d4bff';

// Grade 3×3: células de 10 com 5 de espaço. O ponto ocupa a linha do meio, à direita.
const CELLS: [number, number][] = [
  [0, 0], [15, 0], [30, 0],
  [0, 15], [15, 15],
  [0, 30], [15, 30], [30, 30],
];

export function SpotMark({ className = 'size-7', mono = false, animate = true }: { className?: string; mono?: boolean; animate?: boolean }) {
  return (
    <svg viewBox="-2 -2 46 44" className={className} aria-hidden="true" focusable="false">
      {CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="10" height="10" rx="3" fill="currentColor" />
      ))}
      <circle
        cx="35.5"
        cy="20"
        r="7"
        fill={mono ? 'currentColor' : BLUE}
        className={animate ? 'spot-dot motion-safe:animate-[spot-drop_0.9s_cubic-bezier(0.16,1,0.3,1)_0.2s_both]' : undefined}
      />
    </svg>
  );
}

export function SpotWordmark({ className = '', mono = false }: { className?: string; mono?: boolean }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-baseline font-display font-black lowercase leading-none tracking-[-0.05em] ${className}`}>
      sp
      <span
        className="mx-[0.02em] inline-block size-[0.56em] translate-y-[0.02em] rounded-full"
        style={{ background: mono ? 'currentColor' : BLUE }}
      />
      t
    </span>
  );
}

/** Símbolo + nome. O nome acessível é "Spot". */
export function Logo({ className = '', mono = false }: { className?: string; mono?: boolean }) {
  return (
    <span role="img" aria-label="Spot" className={`group/logo inline-flex items-center gap-2.5 ${className}`}>
      <SpotMark mono={mono} className="size-7 transition-transform duration-500 ease-out-expo group-hover/logo:rotate-[-6deg]" />
      <SpotWordmark mono={mono} className="text-[26px]" />
    </span>
  );
}
