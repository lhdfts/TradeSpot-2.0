'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Arrow, Magnetic } from './Magnetic';
import { HeroCalendar } from './HeroCalendar';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const LINES = [
  { text: 'Cada horário', cls: '' },
  { text: 'no lugar certo.', cls: 'bg-gradient-to-r from-[#7d97ff] via-[#b9c7ff] to-paper bg-clip-text text-transparent' },
];

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() ?? false;

  useGSAP(
    () => {
      if (reduce) return;
      const st = { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true };
      // Parallax mais lento que a página (desce enquanto a página sobe), nunca mais rápido.
      gsap.to('[data-hero-copy]', { y: 90, opacity: 0.3, ease: 'none', scrollTrigger: st });
      gsap.to('[data-hero-cal]', { y: 50, rotate: 3, ease: 'none', scrollTrigger: st });
      gsap.to('[data-hero-glow]', { scale: 1.3, opacity: 0.4, ease: 'none', scrollTrigger: st });
    },
    { scope: root, dependencies: [reduce] },
  );

  return (
    <section ref={root} id="topo" aria-labelledby="hero-title" className="grain relative overflow-hidden bg-ink text-paper">
      <div aria-hidden="true" className="grid-lines-dark absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_45%,black_20%,transparent_75%)]" />
      <div
        data-hero-glow
        aria-hidden="true"
        className="absolute right-[-15%] top-[5%] size-[60vmax] rounded-full bg-[radial-gradient(circle,rgb(29_75_255/0.5)_0%,rgb(29_75_255/0.1)_40%,transparent_70%)] blur-2xl"
      />

      <div className="relative z-10 mx-auto grid max-w-[1280px] items-center gap-14 px-4 pb-20 pt-28 sm:px-8 lg:min-h-[100svh] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-10 lg:pb-16">
        <div data-hero-copy>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-3 rounded-full border border-paper/15 bg-paper/5 py-1.5 pl-1.5 pr-4 font-mono text-xs uppercase tracking-[0.14em] text-smoke backdrop-blur"
          >
            <span className="rounded-full bg-blue px-2.5 py-1 text-paper">Novo</span>
            Agenda para times comerciais
          </motion.p>

          {/* Tamanho limitado pela largura E pela altura da tela, para caber em notebooks baixos. */}
          <h1 id="hero-title" className="font-display text-[clamp(40px,min(6vw,9.5vh),96px)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
            {LINES.map((l, i) => (
              <span key={l.text} className="block overflow-hidden pb-[0.04em] pt-[0.06em]">
                <motion.span
                  className={`block ${l.cls}`}
                  initial={reduce ? { opacity: 0 } : { y: '105%' }}
                  animate={reduce ? { opacity: 1 } : { y: '0%' }}
                  transition={{ duration: 1, ease, delay: 0.2 + i * 0.09 }}
                >
                  {l.text}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.5 }}
            className="mt-6 max-w-[32rem] text-base leading-7 text-paper/80 sm:text-lg sm:leading-8"
          >
            Escala, distribuição automática, no show e reagendamento numa agenda só. Seu lead escolhe o horário. O Spot escolhe quem atende.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.62 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Magnetic href="#loja" variant="blue">
              Escolher plano <Arrow />
            </Magnetic>
            <Magnetic href="#historia" variant="ghost-dark">
              Ver uma tarde de trabalho
            </Magnetic>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-paper/15 pt-5 font-mono text-xs uppercase tracking-[0.12em] text-smoke"
          >
            {[
              ['Distribuição', 'automática'],
              ['Cobrança', 'por atendente'],
              ['Instalação', 'nenhuma'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd className="mt-1 font-display text-base font-bold normal-case tracking-tight text-paper">{v}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <div data-hero-cal className="pb-6">
          <HeroCalendar />
        </div>
      </div>
    </section>
  );
}
