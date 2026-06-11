import { prisma } from "@/lib/db";
import { getDailyCard, getSeededCard } from "@/lib/dexdle";

export const dynamic = "force-dynamic";

// Streams the ANSWER's artwork without exposing its source URL (pokemontcg.io
// URLs contain the set + number, which would spoil the puzzle in devtools).
// The client blurs it heavily and sharpens it with every guess.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "unlimited" ? "unlimited" : "daily";
  const seed = url.searchParams.get("seed") ?? "";

  const card = mode === "unlimited" ? await getSeededCard(seed) : await getDailyCard();
  if (!card) return new Response("No art", { status: 404 });
  // Full-size art isn't carried in the slim game pool — fetch it for this one card.
  const full = await prisma.card.findUnique({ where: { id: card.id }, select: { imageUrl: true } });
  const src = full?.imageUrl ?? card.imageThumbUrl;
  if (!src) return new Response("No art", { status: 404 });

  const upstream = await fetch(src, { cache: "no-store" }).catch(() => null);
  if (!upstream?.ok || !upstream.body) return new Response("Art unavailable", { status: 502 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
      // Daily art is identical for everyone all day; unlimited is per-seed.
      "Cache-Control": mode === "daily" ? "public, s-maxage=3600, stale-while-revalidate=600" : "public, max-age=3600",
    },
  });
}
