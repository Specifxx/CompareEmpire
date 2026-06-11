import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cardTileSelect } from "@/lib/cards";

export const dynamic = "force-dynamic";

// POST { ids: string[] } → card tiles, in the requested order. Powers the
// wishlist page, which keeps its ids client-side (localStorage) and only needs
// the display data. POST (not GET ?ids=) so a big wishlist can't blow the URL
// length limit; capped at 200 ids to keep one request cheap.
const MAX_IDS = 200;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw: unknown = body?.ids;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const ids = Array.from(new Set(raw.filter((v): v is string => typeof v === "string" && v.length > 0))).slice(
    0,
    MAX_IDS
  );
  if (!ids.length) {
    return NextResponse.json({ cards: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const found = await prisma.card.findMany({ where: { id: { in: ids } }, select: cardTileSelect });
  // Preserve the caller's order (most-recently-added first on the wishlist).
  const order = new Map(ids.map((id, i) => [id, i]));
  found.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  // Per-user data — never cache it across viewers.
  return NextResponse.json({ cards: found }, { headers: { "Cache-Control": "no-store" } });
}
