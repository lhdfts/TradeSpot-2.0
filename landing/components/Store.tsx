'use client';

import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { DEMO_URL, PAYMENT_URLS, PLANS, type Billing, type Currency } from '@/lib/data';
import { formatPrice, unitPrice, useStore } from './StoreContext';
import { Arrow, Magnetic } from './Magnetic';
import { lockScroll } from '@/lib/scroll';

const ease = [0.16, 1, 0.3, 1] as const;

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="flex items-center gap-3">
      <legend className="sr-only">{label}</legend>
      <LayoutGroup id={label}>
        <div className="relative flex rounded-full bg-ink/5 p-1">
          {options.map((o) => (
            <label key={o.v} className="relative cursor-pointer">
              <input type="radio" name={label} value={o.v} checked={value === o.v} onChange={() => onChange(o.v)} className="peer sr-only" />
              {value === o.v && <motion.span layoutId="pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span
                className={`relative flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue ${
                  value === o.v ? 'text-paper' : 'text-graphite hover:text-ink'
                }`}
              >
                {o.l}
              </span>
            </label>
          ))}
        </div>
      </LayoutGroup>
    </fieldset>
  );
}

function Price({ value, currency }: { value: number; currency: Currency }) {
  const text = value === 0 ? (currency === 'BRL' ? 'R$ 0' : '$0') : formatPrice(value, currency);
  return (
    <span className="relative inline-flex overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={text} initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-100%', opacity: 0 }} transition={{ duration: 0.4, ease }}>
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Store() {
  const { currency, billing, setCurrency, setBilling, add, item } = useStore();

  return (
    <section id="loja" aria-labelledby="loja-title" className="grain relative bg-paper py-24 lg:py-32">
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-blue">Planos</p>
            <h2 id="loja-title" className="mt-4 font-display text-[clamp(44px,7vw,120px)] font-black uppercase leading-[0.88] tracking-[-0.045em]">
              Leve a agenda<span className="text-blue">.</span>
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-8 text-graphite">Preço por atendente, por mês. Sem taxa por agendamento. Troque de plano quando quiser.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Segmented<Billing>
              label="Cobrança"
              value={billing}
              onChange={setBilling}
              options={[
                { v: 'anual', l: 'Anual · economize' },
                { v: 'mensal', l: 'Mensal' },
              ]}
            />
            <Segmented<Currency>
              label="Moeda"
              value={currency}
              onChange={setCurrency}
              options={[
                { v: 'BRL', l: 'R$' },
                { v: 'USD', l: 'US$' },
              ]}
            />
          </div>
        </div>

        <ul className="mt-16 grid gap-5 lg:grid-cols-3">
          {PLANS.map((p, i) => {
            const featured = p.id === 'essencial';
            const inCart = item?.plan === p.id;
            return (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7, delay: i * 0.08, ease }}
                whileHover={{ y: -6 }}
                className={`relative flex flex-col rounded-[28px] p-8 ${featured ? 'bg-ink text-paper shadow-[0_40px_80px_-30px_rgb(29_75_255/0.55)]' : 'border border-ink/12 bg-mist'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-display text-3xl font-extrabold tracking-tight">{p.name}</h3>
                  {p.badge && (
                    <span className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] ${featured ? 'bg-blue text-paper' : 'bg-ink text-paper'}`}>{p.badge}</span>
                  )}
                </div>
                <p className={`mt-2 ${featured ? 'text-smoke' : 'text-graphite'}`}>{p.pitch}</p>
                <p className="mt-8 flex items-baseline gap-2 font-display text-6xl font-black tracking-[-0.04em]">
                  <Price value={unitPrice(p.id, currency, billing)} currency={currency} />
                  <span className={`font-sans text-sm font-medium tracking-normal ${featured ? 'text-smoke' : 'text-graphite'}`}>{p.id === 'gratis' ? 'para sempre' : 'por atendente/mês'}</span>
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-3 text-[15px] leading-6">
                      <svg aria-hidden="true" viewBox="0 0 16 16" className={`mt-1 size-4 shrink-0 ${featured ? 'text-[#7d97ff]' : 'text-blue'}`} fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Magnetic variant={featured ? 'blue' : 'ink'} onClick={() => add(p.id)} className="mt-10 w-full">
                  {inCart ? 'Na sua assinatura' : p.id === 'gratis' ? 'Começar grátis' : `Assinar ${p.name}`}
                  {!inCart && <Arrow />}
                </Magnetic>
              </motion.li>
            );
          })}
        </ul>

        <div className="mt-5 flex flex-col items-start justify-between gap-6 rounded-[28px] border border-ink/12 p-8 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-display text-2xl font-extrabold tracking-tight">Empresas, acima de 50 atendentes</h3>
            <p className="mt-1 text-graphite">Contrato, faturamento e implantação sob medida.</p>
          </div>
          <Magnetic href={DEMO_URL || '#contato'} variant="ghost-light">
            Falar com vendas <Arrow />
          </Magnetic>
        </div>
      </div>

    </section>
  );
}

/* ------------------------------------------------------------ Gaveta da assinatura */

export function CartDrawer() {
  const { open, setOpen, item, setSeats, clear, currency, billing } = useStore();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    setNotice('');
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(), 60);
    const others = [document.getElementById('conteudo'), document.querySelector('footer'), document.querySelector('header')];
    others.forEach((el) => el?.setAttribute('inert', ''));
    lockScroll(true);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', key);
    return () => {
      clearTimeout(t);
      others.forEach((el) => el?.removeAttribute('inert'));
      lockScroll(false);
      window.removeEventListener('keydown', key);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, setOpen]);

  const plan = item ? PLANS.find((p) => p.id === item.plan)! : null;
  const unit = item ? unitPrice(item.plan, currency, billing) : 0;
  const monthly = unit * (item?.seats ?? 0);
  const total = billing === 'anual' ? monthly * 12 : monthly;

  const checkout = () => {
    if (!item) return;
    const url = PAYMENT_URLS[item.plan];
    if (url) window.location.href = url;
    else setNotice('O link de pagamento deste plano ainda não foi configurado. Cole a URL em lib/data.ts, em PAYMENT_URLS.');
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div
            ref={panel}
            role="dialog"
            data-lenis-prevent
            aria-modal="true"
            aria-labelledby="carrinho-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.55, ease }}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-paper shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
              <h2 id="carrinho-title" className="font-display text-2xl font-extrabold tracking-tight">
                Sua assinatura
              </h2>
              <button type="button" data-autofocus onClick={() => setOpen(false)} aria-label="Fechar" className="grid size-11 place-items-center rounded-full hover:bg-ink/5">
                <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {!item || !plan ? (
              <div className="flex flex-1 flex-col items-start justify-center gap-4 px-6">
                <p className="font-display text-3xl font-extrabold tracking-tight">Nenhum plano ainda.</p>
                <p className="text-graphite">Escolha um plano para ver o total.</p>
                <Magnetic href="#loja" variant="blue" onClick={() => setOpen(false)}>
                  Ver planos <Arrow />
                </Magnetic>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-8 overflow-y-auto px-6 py-8">
                  <motion.div layout className="rounded-3xl bg-ink p-6 text-paper">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-smoke">Plano</p>
                        <p className="mt-1 font-display text-3xl font-extrabold tracking-tight">{plan.name}</p>
                      </div>
                      <button type="button" onClick={clear} className="min-h-10 rounded-full px-3 text-sm font-semibold text-smoke underline-offset-4 hover:text-paper hover:underline">
                        Remover
                      </button>
                    </div>
                    <p className="mt-4 text-sm text-smoke">
                      {formatPrice(unit, currency)} por atendente/mês · cobrança {billing}
                    </p>
                  </motion.div>

                  <div>
                    <label htmlFor="assentos" className="font-display text-lg font-bold">
                      Atendentes
                    </label>
                    <p id="assentos-ajuda" className="text-sm text-graphite">
                      {plan.maxSeats ? `O plano ${plan.name} permite ${plan.maxSeats} atendente.` : 'Quantas pessoas vão atender ligações.'}
                    </p>
                    <div className="mt-3 inline-flex items-center rounded-full border border-ink/25">
                      <button type="button" aria-label="Menos um atendente" onClick={() => setSeats(item.seats - 1)} disabled={item.seats <= 1} className="grid size-12 place-items-center rounded-full text-xl disabled:opacity-40">
                        −
                      </button>
                      <input
                        id="assentos"
                        aria-describedby="assentos-ajuda"
                        inputMode="numeric"
                        value={item.seats}
                        onChange={(e) => setSeats(Number(e.target.value.replace(/\D/g, '')))}
                        className="w-16 bg-transparent text-center font-display text-2xl font-extrabold tabular-nums outline-none focus-visible:rounded-md focus-visible:outline-3 focus-visible:outline-blue"
                      />
                      <button
                        type="button"
                        aria-label="Mais um atendente"
                        onClick={() => setSeats(item.seats + 1)}
                        disabled={!!plan.maxSeats && item.seats >= plan.maxSeats}
                        className="grid size-12 place-items-center rounded-full text-xl disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <dl className="space-y-3 border-t border-ink/10 pt-6 text-[15px]">
                    <div className="flex justify-between">
                      <dt className="text-graphite">Por mês</dt>
                      <dd className="font-semibold tabular-nums">{formatPrice(monthly, currency)}</dd>
                    </div>
                    <div className="flex items-end justify-between">
                      <dt className="text-graphite">{billing === 'anual' ? 'Total no ano' : 'Total hoje'}</dt>
                      <dd className="font-display text-4xl font-black tracking-[-0.03em] tabular-nums" aria-live="polite">
                        <Price value={total} currency={currency} />
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="space-y-3 border-t border-ink/10 px-6 py-5">
                  <Magnetic variant="blue" onClick={checkout} className="w-full">
                    Ir para o pagamento <Arrow />
                  </Magnetic>
                  <AnimatePresence>
                    {notice && (
                      <motion.p role="status" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-graphite">
                        {notice}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
