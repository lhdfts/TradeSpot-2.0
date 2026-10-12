import type { CSSProperties } from 'react';

/** Atraso em cascata para o item `index` (limitado para listas longas não demorarem). */
export function staggerStyle(index: number, step = 40, max = 12): CSSProperties {
  return { '--delay': `${Math.min(index, max) * step}ms` } as CSSProperties;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
