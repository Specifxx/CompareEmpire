// Dexdle — the free "guess the Magic card" game (MTGCompare's Riftle).
// Two modes share one engine:
//   daily     — one card per Sydney day, deterministic, streaks + share grid.
//   unlimited — a fresh random card per round (server-issued seed keeps the
//               answer consistent across guesses without any server state).
// All facts come straight from the card database; the Value column doubles as
// a wink at what the site does — every answer links to its live prices.
import { prisma } from "./db";
import { POKEMON_SETS } from "./pokemon-sets";

export const DEXDLE_ATTEMPTS = 8;

// Rarity ladder for higher/lower hints. Magic rarities aren't perfectly
// linear, so near-equivalents share a tier; unmapped rarities give no hint.
const RARITY_TIER: Record<string, number> = {
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  "Rare Holo": 3,
  "Double Rare": 4,
  "Ultra Rare": 5,
  "Rare Ultra": 5,
  "Illustration Rare": 6,
  "Special Illustration Rare": 7,
  "Rare Secret": 8,
  "Rare Rainbow": 8,
  "Hyper Rare": 8,
};

export type DexdleCard = {
  id: string;
  name: string;
  slug: string | null;
  setCode: string;
  setName: string;
  collectorNumber: string;
  imageThumbUrl: string | null;
  domain: string;
  rarity: string;
  might: number | null; // HP
  marketPriceCents: number | null; // USD guide — powers the Value column
};

const SELECT = {
  id: true, name: true, slug: true, setCode: true, setName: true, collectorNumber: true,
  imageThumbUrl: true, domain: true, rarity: true, might: true, marketPriceCents: true,
} as const;

// Sydney calendar day — the daily flips at midnight AEST like the snapshots.
export function dexdleDay(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Set metadata (release date + series) for the era hint, keyed by set code.
const SET_META = new Map(POKEMON_SETS.map((s) => [s.code, { date: s.releaseDate, series: s.series, name: s.name }]));

// Pool: real Magic (not Trainers/Energies), base prints with art and a REAL
// market value (so the Value column always works), deduped by name keeping the
// most valuable print — the one players actually picture for that name.
//
// Cached in process memory, NOT unstable_cache: the full pool exceeds Vercel's
// 2MB data-cache item limit, and the failed cache write was 500-ing every game
// API. A per-instance memo (1h TTL) costs one DB query per warm lambda and has
// no size ceiling. The pool is also capped to the most valuable names — keeps
// the payload small and every answer a card people might actually recognise.
const POOL_CAP = 1200;
const POOL_TTL_MS = 60 * 60 * 1000;
const g = globalThis as unknown as { __dexdlePool?: { at: number; pool: DexdleCard[] } };

async function getPool(): Promise<DexdleCard[]> {
  const memo = g.__dexdlePool;
  if (memo && Date.now() - memo.at < POOL_TTL_MS) return memo.pool;
  const cards = await prisma.card.findMany({
    where: {
      type: "Magic",
      variant: null,
      isPromo: false,
      imageThumbUrl: { not: null },
      marketPriceSource: "TCGplayer",
      marketPriceCents: { gt: 0 },
    },
    orderBy: [{ marketPriceCents: "desc" }],
    select: SELECT,
    // Egress guard: price-desc + name-dedupe keeps ~1200 of these, so reading
    // more than a few thousand rows is pure data-transfer burn (the old
    // unbounded read was a top driver of the Neon free-tier quota blowout).
    take: 4000,
  });
  const seen = new Set<string>();
  const pool: DexdleCard[] = [];
  for (const c of cards) {
    const k = c.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    pool.push(c as DexdleCard);
    if (pool.length >= POOL_CAP) break; // price-desc order → cap keeps the chase names
  }
  // Stable order so the daily index is deterministic regardless of price moves.
  pool.sort((a, b) => a.name.localeCompare(b.name));
  g.__dexdlePool = { at: Date.now(), pool };
  return pool;
}

export async function getDailyCard(day = dexdleDay()): Promise<DexdleCard | null> {
  const pool = await getPool();
  if (!pool.length) return null;
  return pool[hash(`dexdle:${day}`) % pool.length];
}

// Unlimited mode: the answer is derived from a server-issued random seed, so
// every guess in a round resolves against the same card with zero server state.
export async function getSeededCard(seed: string): Promise<DexdleCard | null> {
  const pool = await getPool();
  if (!pool.length) return null;
  return pool[hash(`dexdle:unlimited:${seed}`) % pool.length];
}

export async function resolveGuess(name: string): Promise<DexdleCard | null> {
  const pool = await getPool();
  const q = name.trim().toLowerCase();
  return pool.find((c) => c.name.toLowerCase() === q) ?? null;
}

export type Cell = { value: string; state: "hit" | "close" | "miss"; hint?: "higher" | "lower" };
export type Feedback = {
  name: string;
  imageThumbUrl: string | null;
  correct: boolean;
  cells: { set: Cell; energy: Cell; rarity: Cell; hp: Cell; value: Cell };
};

function setCell(guess: DexdleCard, answer: DexdleCard): Cell {
  const value = guess.setCode.toUpperCase();
  if (guess.setCode === answer.setCode) return { value, state: "hit" };
  const g = SET_META.get(guess.setCode);
  const a = SET_META.get(answer.setCode);
  // Same era (series) but wrong set → "close" (amber); date arrow = newer/older.
  const close = !!g && !!a && g.series === a.series;
  const hint = g?.date && a?.date ? (a.date > g.date ? ("higher" as const) : ("lower" as const)) : undefined;
  return { value, state: close ? "close" : "miss", ...(hint ? { hint } : {}) };
}

function hpCell(guess: number | null, answer: number | null): Cell {
  const show = guess == null ? "—" : String(guess);
  if (guess === answer) return { value: show, state: "hit" };
  if (guess == null || answer == null) return { value: show, state: "miss" };
  // Within 20 HP → close.
  const state = Math.abs(guess - answer) <= 20 ? ("close" as const) : ("miss" as const);
  return { value: show, state, hint: answer > guess ? "higher" : "lower" };
}

function valueCell(guess: number | null, answer: number | null): Cell {
  const show = guess == null ? "—" : `$${(guess / 100).toFixed(guess >= 10000 ? 0 : 2)}`;
  if (guess == null || answer == null) return { value: show, state: "miss" };
  const ratio = guess / answer;
  if (ratio >= 0.85 && ratio <= 1.18) return { value: show, state: "hit" }; // within ~15%
  if (ratio >= 0.5 && ratio <= 2) return { value: show, state: "close", hint: answer > guess ? "higher" : "lower" };
  return { value: show, state: "miss", hint: answer > guess ? "higher" : "lower" };
}

export function compareGuess(guess: DexdleCard, answer: DexdleCard): Feedback {
  const gi = RARITY_TIER[guess.rarity];
  const ai = RARITY_TIER[answer.rarity];
  const rarity: Cell =
    guess.rarity === answer.rarity
      ? { value: guess.rarity, state: "hit" }
      : gi != null && ai != null
      ? { value: guess.rarity, state: gi === ai ? "close" : "miss", ...(gi !== ai ? { hint: ai > gi ? ("higher" as const) : ("lower" as const) } : {}) }
      : { value: guess.rarity, state: "miss" };
  return {
    name: guess.name,
    imageThumbUrl: guess.imageThumbUrl,
    correct: guess.id === answer.id,
    cells: {
      set: setCell(guess, answer),
      energy: { value: guess.domain, state: guess.domain === answer.domain ? "hit" : "miss" },
      rarity,
      hp: hpCell(guess.might, answer.might),
      value: valueCell(guess.marketPriceCents, answer.marketPriceCents),
    },
  };
}

// Progressive hints (returned by the API once enough guesses are spent).
export function hintsFor(answer: DexdleCard, guessCount: number): { series?: string; firstLetter?: string } {
  const out: { series?: string; firstLetter?: string } = {};
  if (guessCount >= 3) out.series = SET_META.get(answer.setCode)?.series ?? answer.setName;
  if (guessCount >= 5) out.firstLetter = answer.name[0]?.toUpperCase();
  return out;
}

// Names for the client-side autocomplete.
export async function getPoolNames(): Promise<string[]> {
  const pool = await getPool();
  return pool.map((c) => c.name);
}

// Shared accessor for the OTHER minigames (Price Duel, Pack Rip) — same
// real-Magic, priced, name-deduped pool so every game feels consistent.
export async function getGamePool(): Promise<DexdleCard[]> {
  return getPool();
}
