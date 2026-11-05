'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { STORY } from '@/lib/data';
import { scrollToY } from '@/lib/scroll';
import { Board } from './Board';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const ease = [0.16, 1, 0.3, 1] as const;

export function Story() {
  const root = useRef<HTMLElement>(null);
  const pinned = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [step, setStep] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)', () => {
        const n = STORY.length;
        // Pontos de encaixe: começo, o meio de cada capítulo e o fim (para não prender ao sair).
        const points = [0, ...STORY.map((_, i) => (i + 0.5) / n), 1];
        // Um gatilho só para o pin, a barra e o capítulo ativo. Cada capítulo ocupa 70% da
        // altura da tela, então a seção tem o mesmo ritmo em notebook e em monitor grande.
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pinned.current,
            start: 'top top',
            end: () => `+=${Math.round(window.innerHeight * 0.7 * n)}`,
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,
            snap: { snapTo: points, duration: { min: 0.25, max: 0.6 }, delay: 0.08, ease: 'power2.inOut' },
            onUpdate: (self) => setStep(Math.min(n - 1, Math.floor(self.progress * n))),
          },
        });
        tl.fromTo('[data-story-bar]', { scaleX: 0 }, { scaleX: 1, ease: 'none' });
        trigger.current = tl.scrollTrigger ?? null;
        return () => {
          trigger.current = null;
        };
      });
    },
    { scope: root },
  );

  // Nas abas: com o pin ativo, rola até o capítulo; sem pin, só troca.
  const go = (i: number) => {
    const st = trigger.current;
    if (st) {
      const target = st.start + ((st.end - st.start) * (i + 0.5)) / STORY.length;
      scrollToY(target);
    } else setStep(i);
  };

  const current = STORY[step];

  return (
    <section ref={root} id="historia" aria-labelledby="historia-title" className="grain relative bg-mist">
      <div aria-hidden="true" className="grid-lines absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

      {/* Desktop: um quadro fixo enquanto os capítulos passam. */}
      <div ref={pinned} className="relative z-10 hidden min-h-screen items-center lg:flex">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-16 px-8 py-24">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-blue">Uma tarde no time Closer</p>
            <h2 id="historia-title" className="mt-4 font-display text-[clamp(40px,4.4vw,72px)] font-black uppercase leading-[0.96] tracking-[-0.04em]">
              Quatro horas. Zero planilha.
            </h2>

            <div role="tablist" aria-label="Capítulos" className="mt-10 flex gap-2">
              {STORY.map((c, i) => (
                <button
                  key={c.title}
                  role="tab"
                  type="button"
                  aria-selected={i === step}
                  aria-controls="historia-painel"
                  onClick={() => go(i)}
                  className={`min-h-11 rounded-full px-4 font-mono text-xs transition-colors duration-300 ${
                    i === step ? 'bg-ink text-paper' : 'bg-paper text-graphite hover:text-ink'
                  }`}
                >
                  0{i + 1}
                </button>
              ))}
            </div>

            <div id="historia-painel" role="tabpanel" className="relative mt-8 min-h-[260px]">
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.45, ease }}>
                  <span aria-hidden="true" className="text-outline block font-display text-[120px] font-black leading-none tracking-[-0.06em]">
                    0{step + 1}
                  </span>
                  <h3 className="mt-2 font-display text-3xl font-extrabold tracking-tight">{current.title}</h3>
                  <p className="mt-3 max-w-md text-lg leading-8 text-graphite">{current.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-8 h-1 w-full max-w-md overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
              <div data-story-bar className="h-full origin-left scale-x-0 rounded-full bg-blue" />
            </div>
          </div>

          <Board events={current.events} caption={current.caption} />
        </div>
      </div>

      {/* Celular e tablet: capítulos empilhados, cada um com seu quadro. */}
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-24 sm:px-8 lg:hidden">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-blue">Uma tarde no time Closer</p>
        <h2 className="mt-4 font-display text-[clamp(40px,10vw,64px)] font-black uppercase leading-[0.96] tracking-[-0.04em]">Quatro horas. Zero planilha.</h2>
        <ol className="mt-16 space-y-20">
          {STORY.map((c, i) => (
            <motion.li key={c.title} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, ease }}>
              <span aria-hidden="true" className="text-outline block font-display text-[88px] font-black leading-none tracking-[-0.06em]">
                0{i + 1}
              </span>
              <h3 className="mt-2 font-display text-2xl font-extrabold tracking-tight">{c.title}</h3>
              <p className="mt-3 text-base leading-7 text-graphite">{c.body}</p>
              <div className="mt-8">
                <Board events={c.events} caption={c.caption} compact />
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
