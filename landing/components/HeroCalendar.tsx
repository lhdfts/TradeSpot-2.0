'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

// Calendário ilustrado (plano, sem 3D): novembro de 2026 começa num domingo.
const DAYS = 30;
const TODAY = 18;
const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// Agendamentos que vão "chegando" em loop.
const FEED = [
  { day: 18, time: '15:00', lead: 'Marina Souza', who: 'Diego' },
  { day: 19, time: '10:30', lead: 'Caio Nunes', who: 'Ana' },
  { day: 24, time: '14:00', lead: 'Rita Gomes', who: 'Carla' },
  { day: 26, time: '16:30', lead: 'Luís Prado', who: 'Bruno' },
  { day: 12, time: '09:00', lead: 'Sofia Alves', who: 'Ana' },
];

const ease = [0.16, 1, 0.3, 1] as const;

export function HeroCalendar() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setStep((s) => s + 1), 2600);
    return () => clearInterval(id);
  }, [reduce]);

  const current = FEED[step % FEED.length];
  // Dias já agendados: os que passaram pelo feed até agora.
  const booked = new Set(FEED.slice(0, Math.min(FEED.length, step + 1)).map((f) => f.day));
  const list = Array.from({ length: Math.min(3, step + 1) }, (_, i) => ({ ...FEED[(step - i + FEED.length * 10) % FEED.length], key: step - i }));

  return (
    <div className="relative mx-auto w-full max-w-[380px]" role="img" aria-label="Calendário do Spot recebendo agendamentos e distribuindo cada um para um atendente">
      <motion.div
        initial={{ opacity: 0, y: 24, rotate: -2 }}
        animate={reduce ? { opacity: 1, y: 0, rotate: -2 } : { opacity: 1, y: [0, -8, 0], rotate: -2 }}
        transition={reduce ? { duration: 0.6, ease } : { opacity: { duration: 0.8, ease }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
        className="rounded-[28px] bg-paper p-5 text-ink shadow-[0_30px_80px_-30px_rgb(29_75_255/0.6)]"
        aria-hidden="true"
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-extrabold tracking-tight">Novembro</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-soft px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-deep">
            <span className="size-1.5 animate-pulse rounded-full bg-blue" />
            Ao vivo
          </span>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center">
          {WEEK.map((d, i) => (
            <span key={i} className="pb-1 font-mono text-[10px] text-graphite">
              {d}
            </span>
          ))}
          {Array.from({ length: DAYS }, (_, i) => {
            const day = i + 1;
            const isToday = day === TODAY;
            const isSel = day === current.day;
            const isBooked = booked.has(day);
            return (
              <motion.span
                key={day}
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.012, duration: 0.4, ease }}
                className={`relative grid aspect-square place-items-center rounded-lg text-[13px] font-semibold ${
                  isToday ? 'bg-ink text-paper' : i % 7 === 0 || i % 7 === 6 ? 'text-smoke' : ''
                }`}
              >
                {isSel && <motion.span layoutId="sel" className="absolute inset-0 rounded-lg ring-2 ring-blue" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                <span className="relative">{day}</span>
                {isBooked && !isToday && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute bottom-1 size-1 rounded-full bg-blue" />
                )}
              </motion.span>
            );
          })}
        </div>

        <div className="mt-4 border-t border-ink/10 pt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-graphite">Últimos agendamentos</p>
          <ul className="mt-2 space-y-1.5">
            <AnimatePresence initial={false} mode="popLayout">
              {list.map((f, i) => (
                <motion.li
                  key={f.key}
                  layout
                  initial={{ opacity: 0, y: -14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.45, ease }}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[13px] ${i === 0 ? 'bg-blue text-paper' : 'bg-mist'}`}
                >
                  <span className="truncate font-semibold">{f.lead}</span>
                  <span className={`shrink-0 font-mono text-[11px] ${i === 0 ? 'text-paper/85' : 'text-graphite'}`}>
                    {String(f.day).padStart(2, '0')}/11 · {f.time}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </motion.div>

      {/* Aviso flutuante: para quem o lead foi */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          aria-hidden="true"
          initial={{ opacity: 0, x: 16, scale: 0.94 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -10, scale: 0.96 }}
          transition={{ duration: 0.45, ease }}
          className="absolute -bottom-5 -right-2 flex items-center gap-2.5 rounded-2xl border border-paper/15 bg-ink-2 py-2.5 pl-2.5 pr-4 text-paper shadow-xl sm:-right-8"
        >
          <span className="grid size-7 place-items-center rounded-full bg-blue">
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[13px] leading-tight">
            <span className="block text-smoke">Distribuído para</span>
            <span className="font-bold">{current.who}</span>
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
