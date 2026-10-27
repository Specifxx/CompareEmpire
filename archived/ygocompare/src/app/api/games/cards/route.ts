import { NextResponse } from "next/server";
import { getGamePool } from "@/lib/dexdle";

export const dynamic = "force-dynamic";

// Random batch of real cards for the arcade games (Card Catcher, Bulk Breaker):
// name + art + live market value, shuffled server-side. Capped so a game can't
// pull the whole pool.
export async function GET(req: Request) {
  try {
  const url = new URL(req.url);
  const count = Math.min(Math.max(parseInt(url.searchParams.get("count") ?? "48", 10) || 48, 8), 120);
  const pool = await getGamePool();
  if (!pool.length) return NextResponse.json({ cards: [] });

  // Fisher–Yates over a copy of indices; bias half the batch toward valuable
  // cards so games always have exciting "chase" sprites in the mix.
  const idx = Array.from({ length: pool.length }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const byValue = [...pool].sort((a, b) => (b.marketPriceCents ?? 0) - (a.marketPriceCents ?? 0));
  const chase = byValue.slice(0, Math.min(200, byValue.length));
  const picks = [
    ...idx.slice(0, Math.ceil(count / 2)).map((i) => pool[i]),
    ...Array.from({ length: Math.floor(count / 2) }, () => chase[Math.floor(Math.random() * chase.length)]),
  ];

  const seen = new Set<string>();
  const cards = picks
    .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
    .slice(0, count)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageThumbUrl: c.imageThumbUrl,
      rarity: c.rarity,
      priceCents: c.marketPriceCents ?? 0,
    }));

  return NextResponse.json({ cards });
  } catch (e) {
    console.error("games/cards GET failed:", e);
    return NextResponse.json({ error: "Temporarily unavailable — try again shortly." }, { status: 500 });
  }
}
