"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MarketplaceBar } from "@/components/MarketplaceBar";
import { useCart, fmtMoney } from "@/components/MarketplaceCart";

export default function CheckoutPage() {
  const { items, clear } = useCart();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const currency = items[0]?.currency ?? "AUD";
  const subtotal = items.reduce((n, i) => n + i.priceCents * i.qty, 0);
  const shipping = items.reduce((n, i) => n + (i.shipCents ?? 0) * i.qty, 0);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name || !email || !address) { setErr("Please fill in your details."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer: { name, email, address },
          items: items.map((i) => ({ listingId: i.listingId, qty: i.qty })),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || "Checkout failed"); return; }
      clear();
      router.push(`/marketplace/order/${d.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="py-2">
        <MarketplaceBar />
        <div className="card-surface p-8 text-center text-sm text-slate-400">
          Nothing to check out. <Link href="/marketplace/browse" className="text-brand-400 hover:underline">Browse →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <MarketplaceBar />
      <h1 className="mb-1 text-2xl font-extrabold text-white">Checkout</h1>
      <p className="mb-4 text-sm text-gold">Test mode — this simulates a purchase. No card is charged and no real order is shipped.</p>
      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={pay} className="card-surface flex flex-col gap-3 p-5 lg:col-span-2">
          <h2 className="text-lg font-bold text-white">Shipping details</h2>
          <input className="input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <textarea className="input min-h-24" placeholder="Shipping address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <h2 className="mt-2 text-lg font-bold text-white">Payment</h2>
          <div className="rounded-lg border border-dashed border-ink-600 p-3 text-sm text-slate-400">
            💳 Test payment — no real gateway connected. Stripe Connect will go here for live mode.
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button className="btn-primary mt-1" disabled={busy}>{busy ? "Processing…" : `Pay ${fmtMoney(subtotal + shipping, currency)} (test)`}</button>
        </form>
        <div className="card-surface h-fit p-5">
          <h2 className="mb-3 text-lg font-bold text-white">Order</h2>
          {items.map((i) => (
            <div key={i.listingId} className="flex justify-between py-1 text-xs text-slate-300">
              <span className="truncate pr-2">{i.qty}× {i.cardName} <span className="text-slate-500">{i.condition}</span></span>
              <span>{fmtMoney(i.priceCents * i.qty, i.currency)}</span>
            </div>
          ))}
          <div className="my-2 border-t border-ink-700" />
          <div className="flex justify-between py-1 text-sm text-slate-300"><span>Subtotal</span><span>{fmtMoney(subtotal, currency)}</span></div>
          <div className="flex justify-between py-1 text-sm text-slate-300"><span>Shipping</span><span>{fmtMoney(shipping, currency)}</span></div>
          <div className="flex justify-between py-1 text-base font-extrabold text-white"><span>Total</span><span>{fmtMoney(subtotal + shipping, currency)}</span></div>
        </div>
      </div>
    </div>
  );
}
