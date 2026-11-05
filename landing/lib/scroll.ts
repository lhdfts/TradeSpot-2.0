import type Lenis from 'lenis';

// Uma única instância de rolagem suave para a página inteira.
let instance: Lenis | null = null;

export const setLenis = (l: Lenis | null) => {
  instance = l;
};

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Trava a rolagem da página (menu e gaveta abertos). */
export function lockScroll(lock: boolean) {
  document.documentElement.style.overflow = lock ? 'hidden' : '';
  if (lock) instance?.stop();
  else instance?.start();
}

/** Rola até uma posição com a mesma curva da rolagem suave. */
export function scrollToY(y: number) {
  if (instance) instance.scrollTo(y, { duration: 1.2 });
  else window.scrollTo({ top: y, behavior: reduced() ? 'auto' : 'smooth' });
}
