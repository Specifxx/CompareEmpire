import { NextResponse } from "next/server";
import { getGamePool, type DexdleCard } from "@/lib/dexdle";

// Price Duel — endless higher/lower on real market values. Stateless like
// Dexdle's unlimited mode: every card in the run is derived from a server-issued
// seed + the round number, so the server never stores a session and a refresh
// can't reroll the hidden card. Prices stay server-side until a guess lands,
// which is cheat-resistant enough for a casual game.
export const dynamic = "force-dynamic";

// Wire shape for a card panel. Price is only attached once it's safe to reveal.
type DuelCard = {
  name: string;
  imageThumbUrl: string | null;
  slug: string;
  setName: string;
};

const MAX_ROUND = 10000; // bounds the deterministic chain walk per request

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function price(c: DexdleCard): number {
  return c.marketPriceCents ?? 0; // pool guarantees > 0; ?? keeps the type honest
}

// Two prices within 5% of each other are a coin flip, not a duel — skip them.
function tooClose(a: number, b: number): boolean {
  return Math.min(a, b) / Math.max(a, b) > 0.95;
}

// Card at chain position k. The base index hashes `${seed}:${k}`, then skips
// forward past the previous card itself and any near-tie so every matchup has
// a real answer. The skip depends on the neighbour, hence the walk below.
function chainCard(pool: DexdleCard[], seed: string, prev: DexdleCard | null, k: number): DexdleCard {
  let idx = hash(`${seed}:${k}`) % pool.length;
  if (prev) {
    for (let tries = 0; tries < pool.length; tries++) {
      const c = pool[idx];
      if (c.id !== prev.id && !tooClose(price(c), price(prev))) break;
      idx = (idx + 1) % pool.length;
    }
  }
  return pool[idx];
}

// Walk positions 0..round+1 so each position's anti-tie skip resolves against
// its actual left-hand neighbour. O(round) but stateless — that's the trade
// that lets right(round n) === left(round n + 1) without any server session.
function pairFor(pool: DexdleCard[], seed: string, round: number): { left: DexdleCard; right: DexdleCard } {
  let left = chainCard(pool, seed, null, 0);
  for (let k = 1; k <= round; k++) left = chainCard(pool, seed, left, k);
  const right = chainCard(pool, seed, left, round + 1);
  return { left, right };
}

function toCard(c: DexdleCard): DuelCard {
  return { name: c.name, imageThumbUrl: c.imageThumbUrl, slug: c.slug ?? c.id, setName: c.setName };
}

function validSeed(seed: unknown): seed is string {
  return typeof seed === "string" && seed.length > 0 && seed.length <= 32;
}

function validRound(round: unknown): round is number {
  return typeof round === "number" && Number.isInteger(round) && round >= 0 && round <= MAX_ROUND;
}

// GET ?new=1 → fresh seed + round 0 pair. GET ?seed&round → that round's pair
// (lets a player resume mid-run after a reload without losing the chain).
export async function GET(req: Request) {
  const pool = await getGamePool();
  if (pool.length < 2) return NextResponse.json({ error: "Game pool unavailable" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  let seed: string;
  let round: number;
  if (searchParams.get("new")) {
    seed = Math.random().toString(36).slice(2, 10);
    round = 0;
  } else {
    seed = searchParams.get("seed") ?? "";
    round = Number(searchParams.get("round"));
    if (!validSeed(seed) || !validRound(round)) {
      return NextResponse.json({ error: "Bad seed/round" }, { status: 400 });
    }
  }

  const { left, right } = pairFor(pool, seed, round);
  return NextResponse.json({
    seed,
    round,
    left: { ...toCard(left), priceCents: price(left) },
    right: toCard(right), // price withheld — that's the whole game
  });
}

// POST {seed, round, guess} → verdict + the revealed price + the next hidden
// card, so a correct guess flows straight into the next duel with one request.
export async function POST(req: Request) {
  const pool = await getGamePool();
  if (pool.length < 2) return NextResponse.json({ error: "Game pool unavailable" }, { status: 503 });

  let body: { seed?: unknown; round?: unknown; guess?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { seed, round, guess } = body ?? {};
  if (!validSeed(seed) || !validRound(round) || (guess !== "higher" && guess !== "lower")) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { left, right } = pairFor(pool, seed, round);
  // The anti-tie guard means prices are never equal, so this is unambiguous.
  const correct = guess === (price(right) > price(left) ? "higher" : "lower");
  return NextResponse.json({
    correct,
    rightPriceCents: price(right),
    next: { right: toCard(chainCard(pool, seed, right, round + 2)) },
  });
}
