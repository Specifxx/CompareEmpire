"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface CartItem {
  listingId: string;
  cardId: string;
  cardName: string;
  collectorNumber: string;
  imageThumbUrl?: string | null;
  condition: string;
  isFoil: boolean;
  priceCents: number;
  currency: string;
  country: string;
  shipCents: number | null;
  sellerName: string;
  maxQty: number;
  qty: number;
}

interface CartCtx {
  items: CartItem[];
  count: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (listingId: string, qty: number) => void;
  remove: (listingId: string) => void;
  clear: () => void;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "ce_mkt_cart";

export function MarketplaceCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const ex = prev.find((p) => p.listingId === item.listingId);
      if (ex) {
        return prev.map((p) => (p.listingId === item.listingId ? { ...p, qty: Math.min(p.maxQty, p.qty + qty) } : p));
      }
      return [...prev, { ...item, qty: Math.min(item.maxQty, qty) }];
    });
  }, []);
  const setQty = useCallback((listingId: string, qty: number) => {
    setItems((prev) => prev.map((p) => (p.listingId === listingId ? { ...p, qty: Math.max(1, Math.min(p.maxQty, qty)) } : p)));
  }, []);
  const remove = useCallback((listingId: string) => setItems((prev) => prev.filter((p) => p.listingId !== listingId)), []);
  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((n, i) => n + i.qty, 0);
  return <Ctx.Provider value={{ items, count, add, setQty, remove, clear }}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within MarketplaceCartProvider");
  return c;
}

export function fmtMoney(cents: number, currency: string): string {
  const sym = currency === "GBP" ? "£" : currency === "NZD" ? "NZ$" : currency === "USD" ? "US$" : "A$";
  return `${sym}${(cents / 100).toFixed(2)}`;
}
