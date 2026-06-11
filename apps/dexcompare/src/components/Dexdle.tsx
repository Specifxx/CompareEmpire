"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DexdleCard, Feedback } from "@/lib/dexdle";
import { formatMoney } from "@/lib/format";
import { MiniCompare } from "./MiniCompare";
import { WishlistButton } from "./WishlistButton";

// Dexdle — guess the Pokémon card. Daily mode (one card per Sydney day, streaks,
// share grid) + Unlimited mode (endless rounds via server-issued seeds). The
// answer's art shows blurred and sharpens with every guess — the visual hook.
type Mode = "daily" | "unlimited";
type Saved = { day: string; rows: Feedback[]; done: "win" | "lose" | null; answer: DexdleCard | null };
type DailyStats = { played: number; wins: number; streak: number; maxStreak: number; dist: number[]; lastDay: string | null };
type UnlStats = { played: number; wins: number; run: number; bestRun: number };

const KEY = "dx_dexdle";
const KEY_STATS = "dx_dexdle_stats";
const KEY_UNL = "dx_dexdle_unl";
const COLS = ["set", "energy", "rarity", "hp", "value"] as const;
const COL_LABEL: Record<(typeof COLS)[number], string> = {
  set: "Set", energy: "Energy", rarity: "Rarity", hp: "HP", value: "Value",
};

function loadDaily(): DailyStats {
  try { return JSON.parse(localStorage.getItem(KEY_STATS) || "") as DailyStats; }
  catch { return { played: 0, wins: 0, streak: 0, maxStreak: 0, dist: Array(8).fill(0), lastDay: null }; }
}
function loadUnl(): UnlStats {
  try { return JSON.parse(localStorage.getItem(KEY_UNL) || "") as UnlStats; }
  catch { return { played: 0, wins: 0, run: 0, bestRun: 0 }; }
}

// Confetti burst — pure CSS pieces (globals.css .confetti-piece), brand palette.
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: `${(i * 37 + 13) % 100}%`,
        background: ["#ee1515", "#ffcb05", "#3fa129", "#2980ef", "#ef4179"][i % 5],
        delay: `${(i % 9) * 0.12}s`,
        duration: `${2 + ((i * 7) % 10) / 8}s`,
      })),
    []
  );
  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ left: p.left, background: p.background, animationDelay: p.delay, animationDuration: p.duration }}
        />
      ))}
    </>
  );
}

// Live countdown to the next Sydney midnight (when the daily flips).
function NextPuzzleCountdown() {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      // Sydney wall-clock now → ms until its next midnight.
      const syd = new Date(now.toLocaleString("en-US", { timeZone: "Australia/Sydney" }));
      const next = new Date(syd);
      next.setHours(24, 0, 0, 0);
      const ms = next.getTime() - syd.getTime();
      const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4), s = Math.floor((ms % 6e4) / 1e3);
      setLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono font-bold text-gold">{left}</span>;
}

export function Dexdle() {
  const [mode, setMode] = useState<Mode>("daily");
  const [day, setDay] = useState<string | null>(null);
  const [seed, setSeed] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(8);
  const [names, setNames] = useState<string[]>([]);
  const [rows, setRows] = useState<Feedback[]>([]);
  const [done, setDone] = useState<"win" | "lose" | null>(null);
  const [answer, setAnswer] = useState<DexdleCard | null>(null);
  const [hints, setHints] = useState<{ series?: string; firstLetter?: string }>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [daily, setDaily] = useState<DailyStats>({ played: 0, wins: 0, streak: 0, maxStreak: 0, dist: Array(8).fill(0), lastDay: null });
  const [unl, setUnl] = useState<UnlStats>({ played: 0, wins: 0, run: 0, bestRun: 0 });
  const [showStats, setShowStats] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load (or reload on mode switch / new unlimited round).
  async function load(m: Mode, fresh = false) {
    setError(null); setRows([]); setDone(null); setAnswer(null); setHints({}); setInput("");
    try {
      const url = m === "unlimited" ? "/api/dexdle?mode=unlimited&new=1" : "/api/dexdle";
      const d = await fetch(url).then((r) => r.json());
      setAttempts(d.attempts ?? 8);
      if (d.names?.length) setNames(d.names);
      if (m === "unlimited") {
        setSeed(d.seed); setDay(null);
      } else {
        setDay(d.day); setSeed(null);
        if (!fresh) {
          try {
            const saved = JSON.parse(localStorage.getItem(KEY) || "") as Saved;
            if (saved.day === d.day) { setRows(saved.rows ?? []); setDone(saved.done ?? null); setAnswer(saved.answer ?? null); }
          } catch { /* fresh day */ }
        }
      }
    } catch {
      setError("Couldn't load the puzzle — refresh to try again.");
    }
  }

  useEffect(() => {
    load("daily");
    setDaily(loadDaily());
    setUnl(loadUnl());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchMode(m: Mode) {
    if (m === mode) return;
    setMode(m);
    load(m);
  }

  function persistDaily(nextRows: Feedback[], nextDone: Saved["done"], nextAnswer: DexdleCard | null) {
    if (!day) return;
    try { localStorage.setItem(KEY, JSON.stringify({ day, rows: nextRows, done: nextDone, answer: nextAnswer } satisfies Saved)); } catch { /* full */ }
  }

  function finish(win: boolean, guesses: number) {
    if (mode === "daily") {
      const s = loadDaily();
      const dist = [...(s.dist ?? Array(8).fill(0))];
      if (win) dist[Math.min(guesses, 8) - 1]++;
      const next: DailyStats = {
        played: s.played + 1,
        wins: s.wins + (win ? 1 : 0),
        streak: win ? s.streak + 1 : 0,
        maxStreak: Math.max(s.maxStreak ?? 0, win ? s.streak + 1 : 0),
        dist,
        lastDay: day,
      };
      try { localStorage.setItem(KEY_STATS, JSON.stringify(next)); } catch { /* full */ }
      setDaily(next);
    } else {
      const s = loadUnl();
      const next: UnlStats = {
        played: s.played + 1,
        wins: s.wins + (win ? 1 : 0),
        run: win ? s.run + 1 : 0,
        bestRun: Math.max(s.bestRun ?? 0, win ? s.run + 1 : 0),
      };
      try { localStorage.setItem(KEY_UNL, JSON.stringify(next)); } catch { /* full */ }
      setUnl(next);
    }
  }

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (q.length < 2) return [];
    const guessed = new Set(rows.map((r) => r.name.toLowerCase()));
    return names.filter((n) => n.toLowerCase().includes(q) && !guessed.has(n.toLowerCase())).slice(0, 8);
  }, [input, names, rows]);

  async function submit(name: string) {
    if (busy || done) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dexdle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mode, seed: seed ?? undefined, guessNum: rows.length + 1 }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Something went wrong"); return; }
      const nextRows = [...rows, d.feedback as Feedback];
      setRows(nextRows);
      setInput("");
      if (d.hints) setHints((h) => ({ ...h, ...d.hints }));
      if (d.feedback.correct) {
        setDone("win"); setAnswer(d.card ?? null);
        if (mode === "daily") persistDaily(nextRows, "win", d.card ?? null);
        finish(true, nextRows.length);
      } else if (nextRows.length >= attempts) {
        const q = mode === "unlimited" ? `&mode=unlimited&seed=${seed}` : "";
        const rev = await fetch(`/api/dexdle?reveal=1${q}`).then((r) => r.json()).catch(() => null);
        setDone("lose"); setAnswer(rev?.card ?? null);
        if (mode === "daily") persistDaily(nextRows, "lose", rev?.card ?? null);
        finish(false, nextRows.length);
      } else if (mode === "daily") {
        persistDaily(nextRows, null, null);
      }
    } catch {
      setError("Network hiccup — try that guess again.");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function share() {
    const grid = rows
      .map((r) => COLS.map((c) => (r.cells[c].state === "hit" ? "🟩" : r.cells[c].state === "close" ? "🟨" : r.cells[c].hint ? (r.cells[c].hint === "higher" ? "🔼" : "🔽") : "⬛")).join(""))
      .join("\n");
    const score = done === "win" ? `${rows.length}/${attempts}` : `X/${attempts}`;
    const tag = mode === "daily" ? `Dexdle ${day} ${score}` : `Dexdle ∞ ${score}`;
    const text = `${tag}\n${grid}\ndexcompare.app/dexdle`;
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  }

  // Art blur: starts heavy, sharpens with each guess, fully clear when done.
  const blurPx = done ? 0 : Math.max(0, 26 - rows.length * 3.5);
  const artSrc = mode === "unlimited" ? (seed ? `/api/dexdle/art?mode=unlimited&seed=${seed}` : null) : day ? `/api/dexdle/art?day=${day}` : null;

  const cell = (c: Feedback["cells"][(typeof COLS)[number]]) => (
    <div
      className={`flex h-11 items-center justify-center gap-0.5 rounded-md px-1 text-center text-[11px] font-semibold sm:text-xs ${
        c.state === "hit"
          ? "bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-500/50"
          : c.state === "close"
          ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40"
          : "bg-ink-800 text-slate-300"
      }`}
    >
      <span className="truncate">{c.value}</span>
      {c.hint && <span className="text-slate-400">{c.hint === "higher" ? "▲" : "▼"}</span>}
    </div>
  );

  const ready = mode === "daily" ? !!day : !!seed;

  return (
    <div className="mx-auto max-w-2xl">
      {done === "win" && <Confetti />}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold text-white">
            ⚡ Dexdle
            <span className="chip bg-brand-500/15 text-[11px] font-bold uppercase tracking-wide text-brand-400">
              {mode === "daily" ? "Daily" : "Unlimited"}
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Guess the Pokémon card in {attempts} tries — the blurred art sharpens with every guess.
          </p>
        </div>
        <button onClick={() => setShowStats((s) => !s)} className="btn-ghost text-xs">📊 Stats</button>
      </div>

      {/* Mode tabs */}
      <div className="mb-4 flex gap-1 rounded-xl bg-ink-900 p-1">
        {(["daily", "unlimited"] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
              mode === m ? "bg-brand-500/20 text-brand-400" : "text-slate-400 hover:text-white"
            }`}
          >
            {m === "daily" ? "📅 Daily" : "♾️ Unlimited"}
          </button>
        ))}
      </div>

      {/* Stats panel */}
      {showStats && (
        <div className="card-surface mb-4 p-4">
          {mode === "daily" ? (
            <>
              <div className="grid grid-cols-4 gap-2 text-center">
                <Stat v={daily.played} l="played" />
                <Stat v={daily.played ? Math.round((daily.wins / daily.played) * 100) + "%" : "—"} l="win rate" />
                <Stat v={`🔥 ${daily.streak}`} l="streak" gold />
                <Stat v={daily.maxStreak} l="best streak" />
              </div>
              {daily.dist?.some((n) => n > 0) && (
                <div className="mt-3 space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Guess distribution</div>
                  {daily.dist.map((n, i) => {
                    const max = Math.max(...daily.dist, 1);
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-slate-500">{i + 1}</span>
                        <div className="h-4 rounded bg-brand-500/30" style={{ width: `${Math.max(6, (n / max) * 100)}%` }} />
                        <span className="text-slate-400">{n}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-4 gap-2 text-center">
              <Stat v={unl.played} l="rounds" />
              <Stat v={unl.played ? Math.round((unl.wins / unl.played) * 100) + "%" : "—"} l="win rate" />
              <Stat v={`🔥 ${unl.run}`} l="current run" gold />
              <Stat v={unl.bestRun} l="best run" />
            </div>
          )}
        </div>
      )}

      {/* Blurred art — the star of the show. */}
      {ready && artSrc && (
        <div className="card-surface mb-4 overflow-hidden">
          <div className="relative mx-auto flex h-56 items-center justify-center overflow-hidden bg-ink-900 sm:h-64">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artSrc}
              alt="Mystery card"
              className="h-full object-contain transition-[filter,transform] duration-700"
              style={{ filter: `blur(${blurPx}px) saturate(${done ? 1 : 0.9})`, transform: done ? "scale(1)" : "scale(1.25)" }}
            />
            {!done && (
              <span className="absolute bottom-2 right-2 chip bg-ink-950/80 text-[10px] text-slate-400">
                sharpens every guess
              </span>
            )}
          </div>
        </div>
      )}

      {/* Unlocked hints */}
      {!done && (hints.series || hints.firstLetter) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wide text-slate-500">Hints</span>
          {hints.series && <span className="chip bg-sky-500/15 text-sky-300">Era: {hints.series}</span>}
          {hints.firstLetter && <span className="chip bg-gold/15 text-gold">Starts with “{hints.firstLetter}”</span>}
        </div>
      )}

      {/* Guess input */}
      {!done && (
        <div className="relative">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const exact = names.find((n) => n.toLowerCase() === input.trim().toLowerCase());
              if (exact) submit(exact);
              else if (suggestions.length) submit(suggestions[0]);
            }}
            placeholder={ready ? `Guess ${rows.length + 1} of ${attempts} — type a Pokémon card name…` : "Loading puzzle…"}
            disabled={!ready || busy}
            className="input"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl">
              {suggestions.map((n) => (
                <li key={n}>
                  <button onClick={() => submit(n)} className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-ink-800">{n}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}

      {/* Board */}
      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[540px]">
            <div className="mb-1 grid grid-cols-[1.7fr_repeat(5,1fr)] gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <div className="text-left">Card</div>
              {COLS.map((c) => <div key={c}>{COL_LABEL[c]}</div>)}
            </div>
            <div className="space-y-1">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1.7fr_repeat(5,1fr)] gap-1">
                  <div className="flex h-11 items-center gap-2 overflow-hidden rounded-md bg-ink-900 px-2">
                    {r.imageThumbUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.imageThumbUrl} alt="" className="h-9 w-7 shrink-0 rounded-sm object-contain" loading="lazy" />
                    )}
                    <span className="truncate text-xs font-semibold text-white">{r.name}</span>
                  </div>
                  {COLS.map((c) => <div key={c}>{cell(r.cells[c])}</div>)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-600">
        🟩 exact · 🟨 close (same era / within 20 HP / similar value) · ▲▼ the answer is higher / lower · Value = TCGplayer market guide.
      </p>

      {/* Result */}
      {done && (
        <div className={`animate-pop mt-5 rounded-xl border p-5 text-center ${done === "win" ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
          <p className="text-lg font-extrabold text-white">
            {done === "win" ? `Caught it in ${rows.length}/${attempts}! 🎉` : "It got away!"}
          </p>
          {answer && (
            <div className="mt-3 flex items-center justify-center gap-3">
              {answer.imageThumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={answer.imageThumbUrl} alt={answer.name} className="h-28 w-20 rounded-md object-contain" />
              )}
              <div className="text-left">
                <div className="flex items-center gap-2 font-bold text-white">
                  {answer.name}
                  <WishlistButton cardId={answer.id} />
                </div>
                <div className="text-xs text-slate-400">
                  {answer.setName} · {answer.rarity}
                  {answer.might != null ? ` · ${answer.might} HP` : ""}
                </div>
                {answer.marketPriceCents != null && (
                  <div className="mt-0.5 text-sm font-bold text-gold">worth ≈ {formatMoney(answer.marketPriceCents, "USD")}</div>
                )}
              </div>
            </div>
          )}
          {/* The conversion moment: they just sweated over this card's identity
              and value — show where it's actually cheapest, right here. */}
          {answer && <MiniCompare cardIdOrSlug={answer.slug ?? answer.id} />}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button onClick={share} className="btn-primary">{copied ? "✓ Copied!" : "Share result"}</button>
            {mode === "unlimited" ? (
              <button onClick={() => load("unlimited", true)} className="btn-accent">♾️ Play another</button>
            ) : (
              <button onClick={() => switchMode("unlimited")} className="btn-ghost text-sm">Keep playing → Unlimited</button>
            )}
            <Link href="/games" className="btn-ghost text-sm">More games →</Link>
          </div>
          {mode === "daily" && (
            <p className="mt-3 text-xs text-slate-500">
              Next Dexdle in <NextPuzzleCountdown /> (midnight AEST).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ v, l, gold }: { v: number | string; l: string; gold?: boolean }) {
  return (
    <div>
      <div className={`text-base font-extrabold ${gold ? "text-gold" : "text-white"}`}>{v}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{l}</div>
    </div>
  );
}
