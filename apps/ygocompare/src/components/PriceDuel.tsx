"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";
import { MiniCompare } from "./MiniCompare";

// Price Duel — the higher/lower game. The left card's market value is known;
// guess whether the hidden right card is worth more or less. All state lives
// client-side except the answers (server derives them from seed + round), so a
// refresh can't peek at the hidden price. Best streak persists in localStorage.
type DuelCard = { name: string; imageThumbUrl: string | null; slug: string; setName: string };
type Revealed = DuelCard & { priceCents: number };
type Confetti = { id: number; left: number; color: string; delay: number; duration: number };

const BEST_KEY = "dx_duel_best";
// Brand palette so the burst reads as YGOCompare, not generic party popper.
const CONFETTI_COLORS = ["#ee1515", "#ff4d4d", "#ffcb05", "#ffd23f", "#ffffff"];

export function PriceDuel() {
  const [seed, setSeed] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [left, setLeft] = useState<Revealed | null>(null);
  const [right, setRight] = useState<DuelCard | null>(null);
  const [rightPrice, setRightPrice] = useState<number | null>(null); // set once revealed
  // guessing → buttons live · reveal → correct, price pops before the slide · over → wrong
  const [phase, setPhase] = useState<"loading" | "guessing" | "reveal" | "over">("loading");
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const newGame = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setRightPrice(null);
    setStreak(0);
    try {
      const d = await fetch("/api/games/duel?new=1").then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      });
      setSeed(d.seed);
      setRound(d.round ?? 0);
      setLeft(d.left);
      setRight(d.right);
      setPhase("guessing");
    } catch {
      setError("Couldn't start a duel — refresh to try again.");
    }
  }, []);

  useEffect(() => {
    newGame();
    try { setBest(parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0); } catch { /* private mode */ }
  }, [newGame]);

  // Don't advance the round after unmount (e.g. user navigated away mid-reveal).
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function burstConfetti() {
    const pieces: Confetti[] = Array.from({ length: 24 }, (_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.4,
      duration: 2 + Math.random() * 1.4,
    }));
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 4500);
  }

  async function guess(g: "higher" | "lower") {
    if (phase !== "guessing" || !seed || !left || !right) return;
    setPhase("reveal"); // lock the buttons while the verdict is in flight
    setError(null);
    try {
      const res = await fetch("/api/games/duel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed, round, guess: g }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error();
      setRightPrice(d.rightPriceCents);
      if (!d.correct) {
        setPhase("over");
        return;
      }
      const s = streak + 1;
      setStreak(s);
      if (s > best) {
        setBest(s);
        try { localStorage.setItem(BEST_KEY, String(s)); } catch { /* full */ }
      }
      if (s % 5 === 0) burstConfetti(); // milestone every 5 in a row
      // Hold the revealed price for a beat so the win lands, then slide the
      // right card into the left slot — the chained API guarantees continuity.
      const revealed: Revealed = { ...right, priceCents: d.rightPriceCents };
      const next = d.next?.right as DuelCard | undefined;
      timerRef.current = setTimeout(() => {
        setLeft(revealed);
        setRight(next ?? null);
        setRightPrice(null);
        setRound((r) => r + 1);
        setPhase("guessing");
      }, 1100);
    } catch {
      setPhase("guessing"); // guess wasn't consumed server-side — let them retry
      setError("Network hiccup — try that guess again.");
    }
  }

  function share() {
    const text = `Price Duel 🔥 streak ${streak} — can you beat me? dexcompare.app/games/duel`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const panel = (card: DuelCard | null, side: "left" | "right") => (
    <div className="card-surface flex flex-col items-center p-4 sm:p-5">
      {card?.imageThumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.imageThumbUrl} alt={card.name} className="h-48 w-auto rounded-lg object-contain sm:h-60" />
      ) : (
        <div className="h-48 w-36 animate-pulse rounded-lg bg-ink-800 sm:h-60" />
      )}
      <div className="mt-3 min-h-[2.5rem] text-center">
        <div className="font-display text-base font-extrabold text-white">{card?.name ?? "…"}</div>
        <div className="text-xs text-slate-400">{card?.setName ?? ""}</div>
      </div>
      <div className="mt-2 flex min-h-[3.5rem] flex-col items-center justify-center">
        {side === "left" && left ? (
          <>
            <div className="font-display text-2xl font-extrabold text-gold sm:text-3xl">
              {formatMoney(left.priceCents, "USD")}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">market value</div>
          </>
        ) : rightPrice != null ? (
          <>
            <div
              className={`animate-pop font-display text-2xl font-extrabold sm:text-3xl ${
                phase === "over" ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {formatMoney(rightPrice, "USD")}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">market value</div>
          </>
        ) : (
          <div className="font-display text-3xl font-extrabold text-slate-500">?</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl">
      {/* Confetti lives at the top level so pieces fall over the whole viewport. */}
      {confetti.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
        />
      ))}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold text-white">
            ⚔️ Price Duel <span className="chip bg-brand-500/15 text-[11px] font-bold uppercase tracking-wide text-brand-300">Endless</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Is the mystery card worth more or less? Real market values, one wrong guess ends the run.
          </p>
        </div>
        <div className="flex gap-3 text-center text-xs text-slate-400">
          <div><div className="text-base font-extrabold text-gold">🔥 {streak}</div>streak</div>
          <div><div className="text-base font-extrabold text-white">{best}</div>best</div>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {panel(left, "left")}
        {panel(right, "right")}
      </div>

      {phase !== "over" && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => guess("higher")}
            disabled={phase !== "guessing"}
            className="btn-primary min-w-[8rem] text-base"
          >
            ▲ Higher
          </button>
          <button
            onClick={() => guess("lower")}
            disabled={phase !== "guessing"}
            className="btn-ghost min-w-[8rem] text-base"
          >
            ▼ Lower
          </button>
        </div>
      )}
      <p className="mt-2 text-center text-[11px] text-slate-600">
        Guess whether the right card&apos;s market value is higher or lower than the left&apos;s.
      </p>

      {/* Game over: final streak + both reveals, each linking to live prices. */}
      {phase === "over" && (
        <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/5 p-5 text-center">
          <p className="text-lg font-extrabold text-white">
            Streak over at <span className="text-gold">🔥 {streak}</span>
            {streak > 0 && streak >= best ? " — new personal best!" : ` — best ${best}`}
          </p>
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            {left && (
              <p>
                <Link href={`/card/${left.slug}`} className="font-semibold text-brand-400 hover:underline">{left.name}</Link>
                {" "}· {formatMoney(left.priceCents, "USD")} market value — see live prices →
              </p>
            )}
            {right && rightPrice != null && (
              <p>
                <Link href={`/card/${right.slug}`} className="font-semibold text-brand-400 hover:underline">{right.name}</Link>
                {" "}· {formatMoney(rightPrice, "USD")} market value — see live prices →
              </p>
            )}
          </div>
          {/* The card that ended the run is the one they misjudged — show what
              it actually costs at real stores, right here. */}
          {right?.slug && <MiniCompare cardIdOrSlug={right.slug} heading="The card that got you — cheapest stores" />}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button onClick={share} className="btn-primary">{copied ? "✓ Copied!" : "Share streak"}</button>
            <button onClick={newGame} className="btn-ghost">Play again</button>
          </div>
        </div>
      )}
    </div>
  );
}
