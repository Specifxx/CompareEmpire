"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import { MiniCompare } from "./MiniCompare";

// Pack Rip Simulator — flip through a simulated 10-card pack one card at a
// time. The server deals the pack up front; the suspense is purely client-side
// (cards stay face-down until clicked, the hit always lands last). Session
// stats persist in localStorage so "one more pack" has a running score.
type RipCard = { name: string; imageThumbUrl: string | null; slug: string; rarity: string; priceCents: number };
type RipData = {
  set: { code: string; name: string; logo: string | null };
  sets: { code: string; name: string }[];
  cards: RipCard[];
};
type Stats = { packs: number; totalCents: number; bestName: string | null; bestCents: number };

const KEY_STATS = "dx_rip_stats";
// Labelled reference point, not a live quote — keeps the win/lose verdict honest.
const PACK_PRICE_CENTS = 450;
// Total bar tops out at 2× the pack price so the break-even marker sits mid-bar
// and a monster pull visibly pins the needle.
const BAR_MAX_CENTS = PACK_PRICE_CENTS * 2;

// Rarity → chip classes + glow colour for the hit card. Near-equivalent
// rarities share a look; anything unmapped gets a neutral slate.
const RARITY_STYLE: Record<string, { chip: string; glow: string }> = {
  Common: { chip: "bg-ink-700 text-slate-300", glow: "#64748b" },
  Uncommon: { chip: "bg-emerald-500/15 text-emerald-300", glow: "#34d399" },
  Rare: { chip: "bg-sky-500/15 text-sky-300", glow: "#38bdf8" },
  "Rare Holo": { chip: "bg-sky-500/15 text-sky-300", glow: "#38bdf8" },
  "Double Rare": { chip: "bg-violet-500/15 text-violet-300", glow: "#a78bfa" },
  "Ultra Rare": { chip: "bg-violet-500/15 text-violet-300", glow: "#a78bfa" },
  "Rare Ultra": { chip: "bg-violet-500/15 text-violet-300", glow: "#a78bfa" },
  "Illustration Rare": { chip: "bg-rose-500/15 text-rose-300", glow: "#fb7185" },
  "Special Illustration Rare": { chip: "bg-gold/15 text-gold", glow: "#ffd23f" },
  "Rare Secret": { chip: "bg-gold/15 text-gold", glow: "#ffd23f" },
  "Rare Rainbow": { chip: "bg-gold/15 text-gold", glow: "#ffd23f" },
  "Hyper Rare": { chip: "bg-gold/15 text-gold", glow: "#ffd23f" },
};
const DEFAULT_STYLE = { chip: "bg-ink-700 text-slate-300", glow: "#94a3b8" };

function loadStats(): Stats {
  try {
    return JSON.parse(localStorage.getItem(KEY_STATS) || "") as Stats;
  } catch {
    return { packs: 0, totalCents: 0, bestName: null, bestCents: 0 };
  }
}

export function PackRip() {
  const [data, setData] = useState<RipData | null>(null);
  const [packId, setPackId] = useState(0); // bumps per pack so cells remount face-down
  const [flipped, setFlipped] = useState(0); // cards revealed so far, strictly in order
  const [stats, setStats] = useState<Stats>({ packs: 0, totalCents: 0, bestName: null, bestCents: 0 });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (setCode?: string) => {
    setBusy(true);
    setError(null);
    try {
      const d = await fetch(`/api/games/rip${setCode ? `?set=${encodeURIComponent(setCode)}` : ""}`).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      });
      setData(d);
      setPackId((n) => n + 1);
      setFlipped(0);
    } catch {
      setError("Couldn't open a pack — try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
    setStats(loadStats());
  }, [load]);

  const cards = data?.cards ?? [];
  const done = cards.length > 0 && flipped === cards.length;
  const total = cards.slice(0, flipped).reduce((s, c) => s + c.priceCents, 0);
  const best = done ? cards.reduce((a, b) => (b.priceCents > a.priceCents ? b : a)) : null;

  function flip(i: number) {
    if (!data || busy || i !== flipped) return; // only the next face-down card flips
    const n = i + 1;
    setFlipped(n);
    if (n !== data.cards.length) return;
    // Pack complete — roll it into the session stats.
    const packTotal = data.cards.reduce((s, c) => s + c.priceCents, 0);
    const bestPull = data.cards.reduce((a, b) => (b.priceCents > a.priceCents ? b : a));
    const s = loadStats();
    const next: Stats = {
      packs: s.packs + 1,
      totalCents: s.totalCents + packTotal,
      bestName: bestPull.priceCents > s.bestCents ? bestPull.name : s.bestName,
      bestCents: Math.max(s.bestCents, bestPull.priceCents),
    };
    try { localStorage.setItem(KEY_STATS, JSON.stringify(next)); } catch { /* full */ }
    setStats(next);
  }

  function share() {
    if (!best) return;
    const text = `Pack Rip 💥 pulled ${best.name} (${formatMoney(best.priceCents, "USD")}) — pack worth ${formatMoney(total, "USD")}! dexcompare.app/games/rip`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold text-white">
            💥 Pack Rip Simulator <span className="chip bg-brand-500/15 text-[11px] font-bold uppercase tracking-wide text-brand-300">Free</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Rip a simulated 10-card pack — click each card to reveal it. The last slot is always the hit.
          </p>
        </div>
        <div className="flex gap-3 text-center text-xs text-slate-400">
          <div><div className="text-base font-extrabold text-white">{stats.packs}</div>packs</div>
          <div><div className="text-base font-extrabold text-gold">{formatMoney(stats.totalCents, "USD")}</div>opened</div>
          <div>
            <div className="max-w-[10rem] truncate text-base font-extrabold text-white">
              {stats.bestName ? `${stats.bestName}` : "—"}
            </div>
            best pull{stats.bestCents > 0 ? ` (${formatMoney(stats.bestCents, "USD")})` : ""}
          </div>
        </div>
      </div>

      {/* Set picker — the choosable sets come from the API (newest with enough cards). */}
      {data && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label htmlFor="rip-set" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Set</label>
          <select
            id="rip-set"
            value={data.set.code}
            onChange={(e) => load(e.target.value)}
            disabled={busy}
            className="input max-w-xs"
          >
            {data.sets.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}

      {/* Running total bar: fills toward 2× pack price; the marker is break-even. */}
      <div className="card-surface mb-4 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pack value · {flipped}/{cards.length || 10} revealed
          </span>
          <span className={`font-display text-xl font-extrabold ${total >= PACK_PRICE_CENTS ? "text-emerald-400" : "text-gold"}`}>
            {formatMoney(total, "USD")}
          </span>
        </div>
        <div className="relative mt-2 h-2 rounded-full bg-ink-800">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${total >= PACK_PRICE_CENTS ? "bg-emerald-400" : "bg-gold"}`}
            style={{ width: `${Math.min(100, (total / BAR_MAX_CENTS) * 100)}%` }}
          />
          <div className="absolute left-1/2 top-1/2 h-4 w-px -translate-y-1/2 bg-slate-500" />
        </div>
        <div className="mt-1 text-right text-[11px] text-slate-500">typical pack price ≈ US$4.50</div>
      </div>

      {/* The pack: 10 flip cells, clickable strictly left to right. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(cards.length ? cards : Array.from({ length: 10 }, () => null)).map((c, i) => {
          const revealed = c != null && i < flipped;
          const isNext = c != null && i === flipped && !busy;
          const isHit = i === cards.length - 1 && cards.length > 0;
          const style = c ? RARITY_STYLE[c.rarity] ?? DEFAULT_STYLE : DEFAULT_STYLE;
          return (
            <div key={`${packId}-${i}`}>
              <button
                onClick={() => flip(i)}
                disabled={!isNext}
                aria-label={revealed && c ? c.name : `Reveal card ${i + 1}`}
                className={`flip-scene block w-full ${isNext ? "cursor-pointer" : "cursor-default"}`}
              >
                <div
                  className={`flip-inner aspect-[5/7] w-full ${revealed ? "flipped" : ""}`}
                  // Rarity-coloured glow once the hit is on the table.
                  style={isHit && revealed ? { boxShadow: `0 0 26px ${style.glow}`, borderRadius: "0.75rem" } : undefined}
                >
                  {/* Face-down side: our own card back — deliberately no Yu-Gi-Oh! marks. */}
                  <div
                    className={`flip-face flex flex-col items-center justify-center rounded-xl border bg-ink-800 ${
                      isNext ? "border-gold/60 ring-2 ring-gold/40 animate-pulse" : "border-ink-700"
                    }`}
                  >
                    <span className="text-4xl">⚡</span>
                    <span className="mt-2 font-display text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                      YGOCompare
                    </span>
                    {isHit && <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gold">★ hit slot</span>}
                  </div>
                  {/* Revealed side: the card art fills the face (cards are ~5:7 already). */}
                  <div className="flip-face flip-back overflow-hidden rounded-xl border border-ink-700 bg-ink-900">
                    {c?.imageThumbUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.imageThumbUrl} alt={c.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                </div>
              </button>
              {/* Caption reserves height so the grid doesn't jump as cards flip. */}
              <div className="mt-1.5 min-h-[3.6rem] text-center">
                {revealed && c ? (
                  <>
                    <div className="truncate text-xs font-semibold text-white">{c.name}</div>
                    <span className={`chip mt-0.5 ${style.chip} !px-2 !text-[10px]`}>{c.rarity}</span>
                    <div className="animate-pop font-display text-sm font-extrabold text-gold">
                      {formatMoney(c.priceCents, "USD")}
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-slate-600">{isNext ? "tap to reveal" : ""}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* End screen: verdict vs the labelled pack-price reference + best pull. */}
      {done && best && (
        <div
          className={`mt-5 rounded-xl border p-5 text-center ${
            total >= PACK_PRICE_CENTS ? "border-emerald-500/40 bg-emerald-500/5" : "border-ink-700 bg-ink-900"
          }`}
        >
          <p className="text-lg font-extrabold text-white">
            Pack value <span className="text-gold">{formatMoney(total, "USD")}</span> vs typical pack price ≈ US$4.50
            {total >= PACK_PRICE_CENTS ? " — you beat the pack! 🎉" : " — the house wins this one."}
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            {best.imageThumbUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={best.imageThumbUrl} alt={best.name} className="h-24 w-[68px] rounded-md object-cover" />
            )}
            <div className="text-left">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Best pull</div>
              <div className="font-bold text-white">{best.name}</div>
              <div className="text-sm font-extrabold text-gold">{formatMoney(best.priceCents, "USD")}</div>
            </div>
          </div>
          {/* Want the real one? The simulated pull, priced at real stores. */}
          {best.slug && <MiniCompare cardIdOrSlug={best.slug} heading="Want the real one? Cheapest stores" />}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button onClick={() => load(data?.set.code)} disabled={busy} className="btn-primary">
              {busy ? "Opening…" : "Rip another"}
            </button>
            <button onClick={share} className="btn-ghost">{copied ? "✓ Copied!" : "Share pull"}</button>
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-slate-600">
        Simulated for fun — simplified odds, not official pull rates. Values are TCGplayer market guides.
      </p>
    </div>
  );
}
