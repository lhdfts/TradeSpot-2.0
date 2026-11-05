'use client';

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useStore } from './StoreContext';
import { lockScroll } from '@/lib/scroll';

const LINKS = [
  { href: '#historia', label: 'Como funciona' },
  { href: '#colecao', label: 'Módulos' },
  { href: '#loja', label: 'Planos' },
  { href: '#perguntas', label: 'Perguntas' },
];

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-lg font-extrabold tracking-tight ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6">
        <rect x="2" y="4" width="20" height="18" rx="5" fill="#1d4bff" />
        <rect x="6" y="1.5" width="2.6" height="5" rx="1.3" fill="currentColor" />
        <rect x="15.4" y="1.5" width="2.6" height="5" rx="1.3" fill="currentColor" />
        <rect x="6" y="11" width="5" height="4" rx="1.2" fill="#fff" />
      </svg>
      Spot
    </span>
  );
}

export function Nav() {
  const { item, setOpen, pulse } = useStore();
  const [menu, setMenu] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();

  // Some ao descer, volta ao subir.
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > 240 && y > prev && !menu);
  });

  useEffect(() => {
    const main = document.getElementById('conteudo');
    const footer = document.querySelector('footer');
    [main, footer].forEach((el) => el && (menu ? el.setAttribute('inert', '') : el.removeAttribute('inert')));
    lockScroll(menu);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [menu]);

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: hidden ? -110 : 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-4 z-50 px-4"
      >
        <nav
          aria-label="Principal"
          className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 rounded-full border border-paper/15 bg-ink/80 pl-6 pr-2 text-paper shadow-[0_16px_40px_-20px_rgb(0_0_0/0.6),inset_0_1px_0_rgb(255_255_255/0.12)] backdrop-blur-xl backdrop-saturate-150"
        >
          <a href="#topo" aria-label="Spot, início">
            <Logo />
          </a>
          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="rounded-full px-4 py-2 text-sm font-medium text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={item ? 'Abrir assinatura, 1 plano escolhido' : 'Abrir assinatura, nenhum plano escolhido'}
              className="relative grid size-12 place-items-center rounded-full text-paper transition-colors hover:bg-paper/10"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 7h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z" />
                <path d="M9 7a3 3 0 0 1 6 0" />
              </svg>
              <AnimatePresence>
                {item && (
                  <motion.span
                    key={pulse}
                    initial={{ scale: 0.4 }}
                    animate={{ scale: [1.5, 1] }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 14 }}
                    className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-blue font-mono text-[11px] font-medium text-paper"
                    aria-hidden="true"
                  >
                    1
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <a href="#loja" className="hidden min-h-12 items-center rounded-full bg-blue px-5 text-sm font-semibold text-paper transition-colors hover:bg-blue-deep sm:inline-flex">
              Ver planos
            </a>
            <button
              type="button"
              className="grid size-12 place-items-center rounded-full hover:bg-paper/10 md:hidden"
              aria-expanded={menu}
              aria-controls="menu-movel"
              aria-label={menu ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMenu((m) => !m)}
            >
              <span aria-hidden="true" className="relative block h-3 w-5">
                <span className={`absolute left-0 h-0.5 w-5 bg-current transition-transform duration-300 ${menu ? 'top-1.5 rotate-45' : 'top-0'}`} />
                <span className={`absolute left-0 h-0.5 w-5 bg-current transition-transform duration-300 ${menu ? 'top-1.5 -rotate-45' : 'top-3'}`} />
              </span>
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {menu && (
          <motion.div
            id="menu-movel"
            data-lenis-prevent
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 flex flex-col justify-end bg-ink px-6 pb-12 pt-28 text-paper md:hidden"
          >
            <ul className="space-y-2">
              {LINKS.map((l, i) => (
                <motion.li key={l.href} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                  <a href={l.href} onClick={() => setMenu(false)} className="block py-2 font-display text-5xl font-extrabold tracking-tight">
                    {l.label}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
