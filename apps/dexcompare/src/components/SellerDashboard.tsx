"use client";

import { useEffect, useState, useCallback } from "react";
import type { SessionUser } from "@/lib/auth";

interface CardHit { id: string; name: string; setCode: string; collectorNumber: string; imageThumbUrl?: string | null }
interface Listing {
  id: string; condition: string; isFoil: boolean; priceCents: number; quantity: number; country: string; currency: string; shipCents: number | null;
  card: { name: string; collectorNumber: string; setName: string | null; imageThumbUrl: string | null };
}

const COND = ["NM", "LP", "MP", "HP", "DMG"];
const COUNTRIES = ["AU", "NZ", "US", "GB"];

export function SellerDashboard({ user }: { user: SessionUser }) {
  const [listings, setListings] = useState<Listing[]>([]);
  // create-listing form
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CardHit[]>([]);
  const [card, setCard] = useState<CardHit | null>(null);
  const [condition, setCondition] = useState("NM");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [country, setCountry] = useState("AU");
  const [ship, setShip] = useState("");
  const [isFoil, setIsFoil] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const loadListings = useCallback(async () => {
    const res = await fetch("/api/listings");
    const d = await res.json().catch(() => ({ listings: [] }));
    setListings(d.listings ?? []);
  }, []);
  useEffect(() => { loadListings(); }, [loadListings]);

  // debounced card search
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const d = await res.json().catch(() => ({ results: [] }));
      setHits(d.results ?? []);
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  async function createListing(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!card) { setMsg("Pick a card first."); return; }
    const priceCents = Math.round(parseFloat(price) * 100);
    if (!priceCents || priceCents <= 0) { setMsg("Enter a valid price."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id, condition, isFoil, priceCents, quantity: parseInt(qty, 10) || 1,
          country, shipCents: ship ? Math.round(parseFloat(ship) * 100) : null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || "Failed to create listing"); return; }
      setMsg("Listed ✓ — it now appears in the price comparison.");
      setCard(null); setQ(""); setHits([]); setPrice(""); setShip(""); setQty("1");
      loadListings();
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    await fetch(`/api/listings/${id}`, { method: "DELETE" });
    loadListings();
  }

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Seller portal</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {user.displayName}
            {user.verifiedSeller && <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">✓ Verified Seller</span>}
            {user.isAdmin && <span className="ml-2 rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-semibold text-brand-300">Admin</span>}
          </p>
        </div>
        <button onClick={logout} className="btn-ghost text-sm">Sign out</button>
      </div>

      {!user.verifiedSeller ? (
        <div className="card-surface p-5 text-sm text-slate-300">
          Your account isn’t a verified seller yet, so you can’t create marketplace listings.
        </div>
      ) : (
        <form onSubmit={createListing} className="card-surface mb-8 flex flex-col gap-3 p-5">
          <h2 className="text-lg font-bold text-white">List a card</h2>
          {!card ? (
            <>
              <input className="input" placeholder="Search a card to list…" value={q} onChange={(e) => setQ(e.target.value)} />
              {hits.length > 0 && (
                <ul className="max-h-60 overflow-y-auto rounded-lg border border-ink-700">
                  {hits.map((h) => (
                    <li key={h.id}>
                      <button type="button" onClick={() => { setCard(h); setHits([]); setQ(""); }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-ink-800">
                        {h.imageThumbUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={h.imageThumbUrl} alt="" className="h-10 w-7 rounded object-cover" />}
                        <span className="text-sm text-white">{h.name}</span>
                        <span className="text-xs text-slate-500">{h.setCode} · {h.collectorNumber}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-ink-700 p-2">
              {card.imageThumbUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={card.imageThumbUrl} alt="" className="h-12 w-9 rounded object-cover" />}
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{card.name}</div>
                <div className="text-xs text-slate-500">{card.setCode} · {card.collectorNumber}</div>
              </div>
              <button type="button" onClick={() => setCard(null)} className="text-xs text-slate-400 hover:text-white">change</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-slate-400">Condition
              <select className="input" value={condition} onChange={(e) => setCondition(e.target.value)}>{COND.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">Market
              <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">Price ({country})
              <input className="input" inputMode="decimal" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">Qty
              <input className="input" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">Shipping (optional)
              <input className="input" inputMode="decimal" placeholder="default" value={ship} onChange={(e) => setShip(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 self-end text-xs text-slate-300">
              <input type="checkbox" checked={isFoil} onChange={(e) => setIsFoil(e.target.checked)} /> Foil
            </label>
          </div>
          {msg && <p className="text-sm text-slate-300">{msg}</p>}
          <button className="btn-primary self-start" disabled={busy}>{busy ? "Listing…" : "Create listing"}</button>
        </form>
      )}

      <h2 className="mb-3 text-lg font-bold text-white">Your listings ({listings.length})</h2>
      <div className="flex flex-col gap-2">
        {listings.length === 0 && <p className="text-sm text-slate-500">No active listings yet.</p>}
        {listings.map((l) => (
          <div key={l.id} className="card-surface flex items-center gap-3 p-3">
            {l.card.imageThumbUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={l.card.imageThumbUrl} alt="" className="h-12 w-9 rounded object-cover" />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{l.card.name} <span className="text-xs text-slate-500">{l.card.collectorNumber}</span></div>
              <div className="text-xs text-slate-500">{l.condition}{l.isFoil ? " · Foil" : ""} · {l.country} · qty {l.quantity}</div>
            </div>
            <div className="text-right text-sm font-bold text-accent">{l.currency} {(l.priceCents / 100).toFixed(2)}</div>
            <button onClick={() => cancel(l.id)} className="text-xs text-red-400 hover:text-red-300">Cancel</button>
          </div>
        ))}
      </div>
    </div>
  );
}
