import { GUIDES, GUIDE_BY_SLUG } from "@/content/guides";
import { ogCard, wrapWords } from "@/lib/og-card";

// /og/guides/<slug>: a guide's share card (its og:image in every region): the title, large. Static, one PNG per guide at build.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export function GET(_req: Request, { params }: { params: { slug: string } }) {
  const g = GUIDE_BY_SLUG.get(params.slug);
  if (!g) return new Response("Not found", { status: 404 });
  const lines = wrapWords(g.title, 20);
  const size = lines.length <= 3 ? 60 : lines.length === 4 ? 52 : 44;
  return ogCard({
    tag: "Guide",
    lines: lines.map((l, i) => [l, i === lines.length - 1]),
    size,
    sub: "With today’s prices from real stores",
    chips: [g.kicker],
  });
}
