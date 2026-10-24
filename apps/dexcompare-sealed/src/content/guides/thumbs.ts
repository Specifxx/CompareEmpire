// The guides index's thumbnails: per guide, a real product photo (the stores' own, hotlinked like every product card) of the
// product the guide is about, with its price today. ONE scoped read per render: the cheapest open booster box, ETB and bundle of the
// guides' own sets plus the four newest released sets (calendarProducts: at most sets × 3 types × 3 rows). A guide with nothing to
// show (no product of its types open in the region) gets null, and the card falls back to the guide's static share image.
import { calendarProducts, type ProductCardData } from "@/lib/data";
import type { RegionInfo } from "@/lib/regions";
import { TYPE_BY_KEY } from "@/lib/sealed-title";
import { SET_BY_SLUG } from "@/lib/sets";
import { newestReleased } from "./facts";
import type { Guide } from "./index";

/** Pure: pick each guide's photo from the products read, preferring the guide's own sets and types, and a photo not yet used. */
export function pickGuideThumbs(
  guides: readonly Guide[],
  bySet: Map<string, ProductCardData[]>,
  newest: readonly string[],
): Map<string, ProductCardData | null> {
  const used = new Set<string>();
  const out = new Map<string, ProductCardData | null>();
  for (const g of guides) {
    const labels = (g.topic.types ?? []).map((t) => TYPE_BY_KEY.get(t)?.label).filter((x): x is string => !!x);
    const own = (g.topic.sets ?? []).map((s) => SET_BY_SLUG.get(s)?.code).filter((x): x is string => !!x);
    const pool = [...own, ...newest.filter((c) => !own.includes(c))].flatMap((c) => bySet.get(c) ?? []).filter((p) => p.imageUrl);
    const ranked = labels.length ? [...labels.flatMap((l) => pool.filter((p) => p.productType === l)), ...pool] : pool;
    const pick = ranked.find((p) => !used.has(p.slug)) ?? ranked[0] ?? null;
    if (pick) used.add(pick.slug);
    out.set(g.slug, pick);
  }
  return out;
}

export async function guideThumbs(r: RegionInfo, guides: readonly Guide[], today: string): Promise<Map<string, ProductCardData | null>> {
  const newest = newestReleased(today, 4).map((s) => s.code);
  const own = guides
    .flatMap((g) => g.topic.sets ?? [])
    .map((s) => SET_BY_SLUG.get(s)?.code)
    .filter((x): x is string => !!x);
  const codes = [...new Set([...newest, ...own])];
  try {
    return pickGuideThumbs(guides, await calendarProducts(r.market, codes), newest);
  } catch {
    return new Map(); // the index still renders, with the share-image fallbacks
  }
}
