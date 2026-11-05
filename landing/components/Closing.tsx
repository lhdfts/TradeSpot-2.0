'use client';

import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { DEMO_URL } from '@/lib/data';
import { Arrow, Magnetic } from './Magnetic';
import { Logo } from './Nav';

export function Closing() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['8%', '-14%']);

  return (
    <section ref={ref} id="contato" aria-labelledby="final-title" className="grain grain-light on-blue relative overflow-hidden bg-blue py-24 text-paper lg:py-32">
      <motion.p aria-hidden="true" style={{ x }} className="pointer-events-none whitespace-nowrap font-display text-[clamp(120px,22vw,360px)] font-black uppercase leading-[0.8] tracking-[-0.06em] text-paper/10">
        Sem planilha
      </motion.p>
      <div className="relative z-10 mx-auto -mt-[0.5em] max-w-[1440px] px-4 sm:px-8">
        <h2 id="final-title" className="max-w-5xl font-display text-[clamp(48px,8vw,136px)] font-black uppercase leading-[0.94] tracking-[-0.05em]">
          Sua próxima reunião já está organizada.
        </h2>
        <div className="mt-12 flex flex-wrap gap-3">
          <Magnetic href="#loja" variant="paper">
            Escolher plano <Arrow />
          </Magnetic>
          {DEMO_URL && (
            <Magnetic href={DEMO_URL} variant="ghost-dark">
              Agendar demonstração
            </Magnetic>
          )}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-16 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-6 text-smoke">Agenda comercial com distribuição automática. Feito no Brasil.</p>
        </div>
        <nav aria-label="Rodapé">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[
              ['#historia', 'Como funciona'],
              ['#colecao', 'Módulos'],
              ['#loja', 'Planos'],
              ['#perguntas', 'Perguntas'],
            ].map(([h, l]) => (
              <li key={h}>
                <a href={h} className="inline-flex min-h-11 items-center text-smoke transition-colors hover:text-paper">
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="font-mono text-xs text-smoke">© {new Date().getFullYear()} Spot</p>
      </div>
    </footer>
  );
}
