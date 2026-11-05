'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { FAQS } from '@/lib/data';

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="perguntas" aria-labelledby="faq-title" className="bg-paper pb-24 lg:pb-32">
      <div className="mx-auto grid max-w-[1440px] gap-12 border-t border-ink/10 px-4 pt-24 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <h2 id="faq-title" className="font-display text-[clamp(40px,5vw,80px)] font-black uppercase leading-[0.9] tracking-[-0.045em]">
          Perguntas<span className="text-blue">?</span>
        </h2>
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.q}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-${i}`}
                    id={`faq-btn-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left font-display text-xl font-bold tracking-tight sm:text-2xl"
                  >
                    {f.q}
                    <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-300 ${isOpen ? 'bg-blue text-paper' : 'bg-mist group-hover:bg-blue-soft'}`}>
                      <motion.svg animate={{ rotate: isOpen ? 45 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 2v12M2 8h12" strokeLinecap="round" />
                      </motion.svg>
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-${i}`}
                      role="region"
                      aria-labelledby={`faq-btn-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-6 text-lg leading-8 text-graphite">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
