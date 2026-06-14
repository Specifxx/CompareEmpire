import { NextResponse } from "next/server";
import { getGamePool, type DexdleCard } from "@/lib/dexdle";
import { POKEMON_SETS } from "@/lib/pokemon-sets";

// Pack Rip Simulator — deal a simulated 10-card pack from a chosen set.
// Composition is value-tiered (cheap/mid/top thirds + a top-10% "hit") rather
// than real rarity slots: the game pool only keeps one priced print per name,
// so price tiers are the honest stand-in for pull rarity. Plain Math.random is
// fine here — unlike the guessing games there's nothing to cheat.
export const dynamic = "force-dynamic";

const PACK_SIZE = 10;
const MIN_POOL = 40; // below this the value tiers get too thin to feel like a pack
const MAX_SETS = 12; // newest 12 qualifying sets are choosable

type RipCard = {
  name: string;
  imageThumbUrl: string | null;
  slug: string;
  rarity: string;
  priceCents: number;
};

function toCard(c: DexdleCard): RipCard {
  return {
    name: c.name,
    imageThumbUrl: c.imageThumbUrl,
    slug: c.slug ?? c.id,
    rarity: c.rarity,
    priceCents: c.marketPriceCents ?? 0,
  };
}

// Fisher–Yates on a copy — tiers are reused across requests via the cached pool.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 5 from the cheapest third, 3 from the middle, 1 from the top third, then the
// "hit" from the top 10% by value — always last so the rip builds to a climax.
function buildPack(setPool: DexdleCard[]): DexdleCard[] {
  const sorted = [...setPool].sort((a, b) => (a.marketPriceCents ?? 0) - (b.marketPriceCents ?? 0));
  const third = Math.floor(sorted.length / 3);
  const tiers: [DexdleCard[], number][] = [
    [sorted.slice(0, third), 5],
    [sorted.slice(third, third * 2), 3],
    [sorted.slice(third * 2), 1],
  ];

  const used = new Set<string>();
  const pack: DexdleCard[] = [];
  for (const [tier, want] of tiers) {
    let got = 0;
    for (const c of shuffle(tier)) {
      if (got >= want) break;
      used.add(c.id);
      pack.push(c);
      got++;
    }
    // Thin tier → top up from anywhere in the set so the pack never runs short.
    for (const c of shuffle(sorted)) {
      if (got >= want) break;
      if (used.has(c.id)) continue;
      used.add(c.id);
      pack.push(c);
      got++;
    }
  }

  // The hit: weighted inversely by price so chase cards stay rare — most real
  // pulls are modest, and a guaranteed top-end hit would cheapen the good ones.
  const hitTier = sorted.slice(Math.max(0, Math.floor(sorted.length * 0.9)));
  const fresh = hitTier.filter((c) => !used.has(c.id));
  const candidates = fresh.length ? fresh : hitTier;
  const weights = candidates.map((c) => 1 / Math.max(1, c.marketPriceCents ?? 1));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  let hit = candidates[candidates.length - 1];
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) { hit = candidates[i]; break; }
  }
  pack.push(hit);

  // Belt-and-braces: qualifying sets have >= MIN_POOL cards, but never return
  // a short pack even if that invariant slips (duplicates beat a broken rip).
  for (let i = 0; pack.length < PACK_SIZE && sorted.length > 0; i++) {
    pack.push(sorted[i % sorted.length]);
  }
  return pack.slice(0, PACK_SIZE);
}

export async function GET(req: Request) {
  const pool = await getGamePool();
  const bySet = new Map<string, DexdleCard[]>();
  for (const c of pool) {
    const list = bySet.get(c.setCode);
    if (list) list.push(c);
    else bySet.set(c.setCode, [c]);
  }

  // POKEMON_SETS is newest-first, so the first qualifying sets are the newest;
  // the default set is simply the first one.
  const choosable = POKEMON_SETS.filter((s) => (bySet.get(s.code)?.length ?? 0) >= MIN_POOL).slice(0, MAX_SETS);
  if (!choosable.length) {
    return NextResponse.json({ error: "No sets have enough cards yet" }, { status: 503 });
  }

  const requested = new URL(req.url).searchParams.get("set");
  const set = choosable.find((s) => s.code === requested) ?? choosable[0];
  const cards = buildPack(bySet.get(set.code)!);

  return NextResponse.json({
    set: { code: set.code, name: set.name, logo: set.logo },
    sets: choosable.map((s) => ({ code: s.code, name: s.name })),
    cards: cards.map(toCard),
  });
}
