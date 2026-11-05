'use client';

import { animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const FACTS = [
  { value: 1, suffix: '', unit: 'clique', label: 'para marcar No show ou Realizado.' },
  { value: 4, suffix: '', unit: 'status', label: 'Pendente, Realizado, No show e Reagendado.' },
  { value: 30, suffix: '', unit: 'min', label: 'de antecedência mínima. Ninguém é pego de surpresa.' },
  { value: 0, suffix: '', unit: 'planilhas', label: 'para saber quem atende o próximo lead.' },
];

function Count({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduce = useReducedMotion();
  const [n, setN] = useState(to);

  useEffect(() => {
    if (!inView || reduce || to === 0) return;
    const c = animate(0, to, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, reduce, to]);

  return <span ref={ref}>{n}</span>;
}

export function Highlights() {
  return (
    <section aria-labelledby="destaques-title" className="grain grain-light on-blue relative overflow-hidden bg-blue text-paper">
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-24 sm:px-8 lg:py-32">
        <h2 id="destaques-title" className="max-w-4xl font-display text-[clamp(36px,5vw,72px)] font-black uppercase leading-[0.92] tracking-[-0.04em]">
          Menos conversa no grupo. Mais ligação feita.
        </h2>
        <dl className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-paper/20 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f, i) => (
            <motion.div
              key={f.unit}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col justify-between gap-10 bg-blue p-8"
            >
              <dt className="order-2 text-base leading-7 text-paper/85">{f.label}</dt>
              <dd className="order-1 font-display font-black leading-none tracking-[-0.05em]">
                <span className="text-[clamp(72px,8vw,128px)]">
                  <Count to={f.value} />
                </span>
                <span className="ml-2 text-2xl tracking-tight">{f.unit}</span>
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}
