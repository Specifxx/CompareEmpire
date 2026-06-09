"use client";

import Link from "next/link";
import { useCart } from "./MarketplaceCart";

export function MarketplaceBar() {
  const { count } = useCart();
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-2">
      <div className="flex items-center gap-3 text-sm">
        <Link href="/marketplace/browse" className="font-semibold text-white hover:text-brand-400">Marketplace</Link>
        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">Test mode</span>
      </div>
      <Link href="/marketplace/cart" className="relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-200 hover:bg-ink-800">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
        Cart
        {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-xs font-bold text-white">{count}</span>}
      </Link>
    </div>
  );
}
