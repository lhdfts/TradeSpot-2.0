'use client';

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { MODULES, type ModuleTone } from '@/lib/data';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TONE: Record<ModuleTone, { card: string; tag: string; muted: string }> = {
  blue: { card: 'bg-blue text-paper', tag: 'bg-paper text-blue', muted: 'text-paper/80' },
  ink: { card: 'bg-ink-2 text-paper border border-paper/10', tag: 'bg-blue text-paper', muted: 'text-smoke' },
  paper: { card: 'bg-paper text-ink', tag: 'bg-ink text-paper', muted: 'text-graphite' },
};

/** Miniaturas desenhadas em HTML: cada módulo como um "produto na vitrine". */
function Visual({ id, tone }: { id: string; tone: ModuleTone }) {
  const line = tone === 'paper' ? 'bg-ink/10' : 'bg-paper/15';
  const solid = tone === 'blue' ? 'bg-paper' : 'bg-blue';
  const dim = tone === 'paper' ? 'bg-ink/80' : 'bg-paper/85';
  switch (id) {
    case 'agenda':
      return (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 28 }, (_, i) => (
            <span key={i} className={`aspect-square rounded-md ${[3, 9, 10, 16, 22].includes(i) ? solid : line}`} />
          ))}
        </div>
      );
    case 'distribuicao':
      return (
        <div className="space-y-2">
          {[0.35, 0.6, 0.2, 0.8].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`size-6 rounded-full ${i === 2 ? solid : line}`} />
              <span className={`h-3 rounded-full ${i === 2 ? solid : dim} opacity-90`} style={{ width: `${w * 100}%` }} />
            </div>
          ))}
        </div>
      );
    case 'lembretes':
      return (
        <div className="space-y-2">
          <div className="rounded-2xl bg-ink p-3 text-paper shadow-lg">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-smoke">Em 10 min</p>
            <p className="mt-1 text-sm font-bold">Ligação com Rita G.</p>
          </div>
          <div className={`h-12 rounded-2xl ${line}`} />
        </div>
      );
    case 'noshow':
      return (
        <div className="flex items-center gap-3">
          <span className={`flex-1 rounded-xl ${dim} p-3 text-center text-xs font-bold ${tone === 'paper' ? 'text-paper' : 'text-ink'}`}>No show</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12h15M14 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="flex-1 rounded-xl border-2 border-dashed border-current p-3 text-center text-xs font-bold">Reagendado</span>
        </div>
      );
    case 'eventos':
      return (
        <div className="grid grid-cols-3 gap-2">
          {['Workshop', 'Imersão', 'Live'].map((n, i) => (
            <span key={n} className={`rounded-xl p-3 text-center text-xs font-bold ${i === 0 ? `${solid} ${tone === 'blue' ? 'text-blue' : 'text-paper'}` : line}`}>
              {n}
            </span>
          ))}
        </div>
      );
    case 'metricas':
      return (
        <div className="flex h-24 items-end gap-2">
          {[40, 65, 35, 80, 55, 95, 70].map((h, i) => (
            <span key={i} className={`flex-1 rounded-t-md ${i === 5 ? 'bg-blue' : 'bg-ink/15'}`} style={{ height: `${h}%` }} />
          ))}
        </div>
      );
    default:
      return (
        <ul className="space-y-1.5 font-mono text-[11px]">
          {['14:02  Ana marcou Realizado', '14:31  Bruno marcou No show', '15:10  Carla editou a escala'].map((l) => (
            <li key={l} className="truncate rounded-lg bg-paper/10 px-2.5 py-1.5">
              {l}
            </li>
          ))}
        </ul>
      );
  }
}

function Card({ m, index }: { m: (typeof MODULES)[number]; index: number }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });
  const glareX = useTransform(mx, [-0.5, 0.5], ['0%', '100%']);
  const t = TONE[m.tone];

  return (
    <motion.article
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={`group relative flex h-[440px] w-[min(82vw,360px)] shrink-0 snap-start flex-col overflow-hidden rounded-[28px] p-7 ${t.card}`}
    >
      <motion.span
        aria-hidden="true"
        style={{ left: glareX }}
        className="pointer-events-none absolute -top-1/2 h-[200%] w-24 -translate-x-1/2 rotate-12 bg-white/20 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="flex items-start justify-between gap-4">
        <span className="font-mono text-xs opacity-70">{String(index + 1).padStart(2, '0')} / {String(MODULES.length).padStart(2, '0')}</span>
        <span className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] ${t.tag}`}>{m.plan}</span>
      </div>
      <div className="mt-8 flex-1">
        <Visual id={m.id} tone={m.tone} />
      </div>
      <h3 className="mt-6 font-display text-3xl font-extrabold leading-tight tracking-tight">{m.name}</h3>
      <p className={`mt-2 text-[15px] leading-6 ${t.muted}`}>{m.line}</p>
    </motion.article>
  );
}

export function Showcase() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const el = track.current!;
        const distance = () => el.scrollWidth - window.innerWidth + 64;
        gsap.to(el, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: true, invalidateOnRefresh: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="colecao" aria-labelledby="colecao-title" className="grain relative overflow-hidden bg-ink py-24 text-paper lg:flex lg:min-h-screen lg:flex-col lg:justify-center lg:py-16">
      <div aria-hidden="true" className="grid-lines-dark absolute inset-0" />
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-wrap items-end justify-between gap-6 px-4 sm:px-8">
        <h2 id="colecao-title" className="font-display text-[clamp(44px,7vw,120px)] font-black uppercase leading-[0.88] tracking-[-0.045em]">
          A coleção<span className="text-blue">.</span>
        </h2>
        <p className="max-w-sm text-lg leading-8 text-smoke">Sete módulos que trabalham juntos. Escolha o plano e leve todos os que ele inclui.</p>
      </div>
      <div
        ref={track}
        className="relative z-10 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:px-8 lg:w-max lg:snap-none lg:overflow-visible lg:pl-[max(2rem,calc((100vw-1440px)/2+2rem))]"
      >
        {MODULES.map((m, i) => (
          <Card key={m.id} m={m} index={i} />
        ))}
      </div>
    </section>
  );
}
