import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildCardWhere, cardTileSelect } from "@/lib/cards";
import { getSelectedGames } from "@/lib/get-games";

// Typeahead for the navbar — scoped to the visitor's selected games (the games
// cookie), priced cards first so the dropdown leads with useful results.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const selected = getSelectedGames();
  const cards = await prisma.card.findMany({
    where: buildCardWhere({ q }, selected),
    orderBy: [{ marketPriceCents: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    take: 8,
    select: cardTileSelect,
  });

  return NextResponse.json({ results: cards });
}
