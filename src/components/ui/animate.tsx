import { useLayoutEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { prefersReducedMotion, staggerStyle } from '../../lib/motion';

interface FadeInProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Posição na cascata; cada passo atrasa `step` ms. */
  index?: number;
  step?: number;
  /** `fade-up` (padrão) ou `blur-fade` (desfoque leve, para destaque pontual). */
  variant?: 'blur-fade' | 'fade-up';
}

/** Entrada suave com atraso opcional em cascata. */
export function FadeIn({ index = 0, step = 40, variant = 'fade-up', className, style, ...props }: FadeInProps) {
  return (
    <div
      className={cn(variant === 'blur-fade' ? 'animate-blur-fade' : 'animate-fade-up', className)}
      style={{ ...staggerStyle(index, step), ...style }}
      {...props}
    />
  );
}

interface CountUpProps {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}

const formatoPadrao = (n: number) => n.toLocaleString('pt-BR');

/**
 * Número que conta até o valor (padrão Number Ticker); ao mudar, continua do
 * valor atual. Escreve direto no texto do elemento a cada quadro, sem
 * re-renderizar o componente. Com "menos movimento" mostra o valor final.
 */
export function CountUp({ value, duration = 600, className, format }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef(0);
  // `format` costuma vir como função inline: guardado em ref para não reiniciar a contagem.
  const formatRef = useRef(format);
  useLayoutEffect(() => {
    formatRef.current = format;
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const write = (n: number) => {
      el.textContent = (formatRef.current ?? formatoPadrao)(Math.round(n));
    };

    if (prefersReducedMotion() || duration <= 0) {
      current.current = value;
      write(value);
      return;
    }

    const from = current.current;
    write(from);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      current.current = from + (value - from) * eased;
      write(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span ref={ref} className={className} />;
}
