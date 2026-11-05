'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { PLANS, PRICES, type Billing, type Currency, type PlanId } from '@/lib/data';

type CartItem = { plan: PlanId; seats: number };

type Store = {
  currency: Currency;
  billing: Billing;
  setCurrency: (c: Currency) => void;
  setBilling: (b: Billing) => void;
  item: CartItem | null;
  add: (plan: PlanId) => void;
  setSeats: (n: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  /** Muda a cada adição, para animar o selo do carrinho. */
  pulse: number;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('BRL');
  const [billing, setBilling] = useState<Billing>('anual');
  const [item, setItem] = useState<CartItem | null>(null);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(0);

  const add = useCallback((plan: PlanId) => {
    const max = PLANS.find((p) => p.id === plan)?.maxSeats;
    setItem((prev) => ({ plan, seats: max ? Math.min(max, prev?.seats ?? 1) : Math.max(prev?.seats ?? 5, 1) }));
    setPulse((n) => n + 1);
    setOpen(true);
  }, []);

  const setSeats = useCallback((n: number) => {
    setItem((prev) => {
      if (!prev) return prev;
      const max = PLANS.find((p) => p.id === prev.plan)?.maxSeats ?? 500;
      return { ...prev, seats: Math.min(max, Math.max(1, Math.round(n) || 1)) };
    });
  }, []);

  const value = useMemo(
    () => ({ currency, billing, setCurrency, setBilling, item, add, setSeats, clear: () => setItem(null), open, setOpen, pulse }),
    [currency, billing, item, add, setSeats, open, pulse],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore fora do StoreProvider');
  return ctx;
}

export function formatPrice(value: number, currency: Currency) {
  return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function unitPrice(plan: PlanId, currency: Currency, billing: Billing) {
  return PRICES[plan][currency][billing];
}
