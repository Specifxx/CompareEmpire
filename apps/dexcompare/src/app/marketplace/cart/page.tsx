"use client";

import Link from "next/link";
import { MarketplaceBar } from "@/components/MarketplaceBar";
import { useCart, fmtMoney } from "@/components/MarketplaceCart";

export default function CartPage() {
  const { items, setQty, remove } = useCart();
  const currency = items[0]?.currency ?? "AUD";
  const subtotal = items.reduce((n, i) => n + i.priceCents * i.qty, 0);
  const shipping = items.reduce((n, i) => n + (i.shipCents ?? 0) * i.qty, 0);
  const mixed = new Set(items.map((i) => i.currency)).size > 1;

  return (
    <div className="py-2">
      <MarketplaceBar />
      <h1 className="mb-4 text-2xl font-extrabold text-white">Your cart</h1>
      {items.length === 0 ? (
        <div className="card-surface p-8 text-center text-sm text-slate-400">
          Your cart is empty. <Link href="/marketplace/browse" className="text-brand-400 hover:underline">Browse the marketplace →</Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-2 lg:col-span-2">
            {items.map((i) => (
              <div key={i.listingId} className="card-surface flex items-center gap-3 p-3">
                {i.imageThumbUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={i.imageThumbUrl} alt="" className="h-16 w-12 rounded object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{i.cardName} <span className="text-xs text-slate-500">{i.collectorNumber}</span></div>
                  <div className="text-xs text-slate-500">{i.condition}{i.isFoil ? " · Foil" : ""} · {i.sellerName}</div>
                  <div className="mt-1 text-sm font-bold text-accent">{fmtMoney(i.priceCents, i.currency)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setQty(i.listingId, i.qty - 1)} className="grid h-7 w-7 place-items-center rounded bg-ink-800 text-white">–</button>
                  <span className="w-7 text-center text-sm text-white">{i.qty}</span>
                  <button onClick={() => setQty(i.listingId, i.qty + 1)} className="grid h-7 w-7 place-items-center rounded bg-ink-800 text-white">+</button>
                </div>
                <button onClick={() => remove(i.listingId)} className="ml-2 text-xs text-red-400 hover:text-red-300">Remove</button>
              </div>
            ))}
          </div>
          <div className="card-surface h-fit p-5">
            <h2 className="mb-3 text-lg font-bold text-white">Summary</h2>
            {mixed && <p className="mb-2 text-xs text-amber-400">Items are in multiple currencies; totals shown in {currency}.</p>}
            <Row label="Subtotal" value={fmtMoney(subtotal, currency)} />
            <Row label="Shipping" value={fmtMoney(shipping, currency)} />
            <div className="my-2 border-t border-ink-700" />
            <Row label="Total" value={fmtMoney(subtotal + shipping, currency)} bold />
            <Link href="/marketplace/checkout" className="btn-primary mt-4 block text-center">Proceed to checkout</Link>
            <p className="mt-2 text-center text-[11px] text-gold">Test mode — no real payment</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${bold ? "font-extrabold text-white" : "text-slate-300"}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
