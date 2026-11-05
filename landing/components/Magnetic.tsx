'use client';

import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { useRef } from 'react';

type Variant = 'blue' | 'paper' | 'ink' | 'ghost-dark' | 'ghost-light';

const styles: Record<Variant, string> = {
  blue: 'bg-blue text-paper hover:bg-blue-deep',
  paper: 'bg-paper text-ink hover:bg-blue-soft',
  ink: 'bg-ink text-paper hover:bg-ink-3',
  'ghost-dark': 'border border-paper/30 text-paper hover:border-paper hover:bg-paper/5',
  'ghost-light': 'border border-ink/25 text-ink hover:border-ink hover:bg-ink/5',
};

/** Botão/link que é puxado de leve pelo cursor. Desliga em toque e em movimento reduzido. */
export function Magnetic({
  href,
  onClick,
  children,
  variant = 'blue',
  className = '',
  type = 'button',
  ...rest
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  type?: 'button' | 'submit';
} & Omit<React.AriaAttributes, never>) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.4 });

  const move = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.28);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.36);
  };
  const leave = () => {
    x.set(0);
    y.set(0);
  };

  const cls = `group relative inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold tracking-tight transition-colors duration-200 ${styles[variant]} ${className}`;
  const inner = (
    <motion.span style={{ x: useSpring(x, { stiffness: 400, damping: 30 }), y }} className="inline-flex items-center gap-2">
      {children}
    </motion.span>
  );

  if (href) {
    return (
      <motion.a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        onClick={onClick}
        onPointerMove={move}
        onPointerLeave={leave}
        style={{ x, y }}
        whileTap={{ scale: 0.97 }}
        className={cls}
        {...rest}
      >
        {inner}
      </motion.a>
    );
  }
  return (
    <motion.button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type={type}
      onClick={onClick}
      onPointerMove={move}
      onPointerLeave={leave}
      style={{ x, y }}
      whileTap={{ scale: 0.97 }}
      className={cls}
      {...rest}
    >
      {inner}
    </motion.button>
  );
}

export function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={`size-4 transition-transform duration-300 ease-out-expo group-hover:translate-x-1 ${className}`}>
      <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
