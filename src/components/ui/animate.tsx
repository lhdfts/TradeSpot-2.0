import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { prefersReducedMotion, staggerStyle } from '../../lib/motion';

interface FadeInProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Posição na cascata; cada passo atrasa `step` ms. */
  index?: number;
  step?: number;
  /** `blur-fade` (padrão, para cards) ou `fade-up` (para blocos grandes). */
  variant?: 'blur-fade' | 'fade-up';
}

/** Entrada suave com atraso opcional em cascata (padrão Blur Fade). */
export function FadeIn({ index = 0, step = 60, variant = 'blur-fade', className, style, ...props }: FadeInProps) {
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

/** Número que conta até o valor (padrão Number Ticker); ao mudar, continua do valor atual. */
export function CountUp({ value, duration = 900, className, format }: CountUpProps) {
  const reduced = prefersReducedMotion();
  const [display, setDisplay] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const from = current.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      current.current = from + (value - from) * eased;
      setDisplay(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);

  const rounded = Math.round(reduced ? value : display);
  return <span className={className}>{format ? format(rounded) : rounded.toLocaleString('pt-BR')}</span>;
}
