import type { MetadataRoute } from "next";
import { setCounts, sitemapEntries, typesByMarket } from "@/lib/data";
import { REGION_LIST, regionOfMarket } from "@/lib/regions";
import { PRODUCT_TYPES } from "@/lib/sealed-title";
import { SETS } from "@/lib/sets";
import { SITE_URL } from "@/lib/site";
import { STORES } from "@/lib/stores";

export const revalidate = 86400;

// Only pages with something on them: products a region's stores actually list
// (a product nobody in a region lists is noindex there), and a region's stores.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const out: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
  ];
  for (const r of REGION_LIST) {
    const base = `${SITE_URL}/${r.region}`;
    out.push({ url: base, changeFrequency: "daily", priority: 0.9 });
    out.push({ url: `${base}/sealed`, changeFrequency: "daily", priority: 0.8 });
    out.push({ url: `${base}/sets`, changeFrequency: "weekly", priority: 0.6 });
    out.push({ url: `${base}/stores`, changeFrequency: "weekly", priority: 0.5 });
  }
  // Type and set pages only where the region's stores list something.
  try {
    const types = await typesByMarket();
    for (const r of REGION_LIST) {
      for (const t of PRODUCT_TYPES) {
        if (types.get(r.market)?.has(t.label)) out.push({ url: `${SITE_URL}/${r.region}/type/${t.slug}`, changeFrequency: "daily", priority: 0.7 });
      }
      const counts = await setCounts(r.market);
      for (const s of SETS) if (counts.has(s.code)) out.push({ url: `${SITE_URL}/${r.region}/sets/${s.slug}`, changeFrequency: "daily", priority: 0.6 });
    }
  } catch (e) {
    console.warn("sitemap: set list unavailable:", (e as Error).message);
  }
  for (const s of STORES) {
    const r = regionOfMarket(s.market);
    if (r) out.push({ url: `${SITE_URL}/${r.region}/stores/${s.key}`, changeFrequency: "daily", priority: 0.4 });
  }
  // The build runs before any import, and must not fail if the database is
  // unreachable: the first post-import refresh fills this in.
  try {
    for (const e of await sitemapEntries()) {
      const r = regionOfMarket(e.market);
      if (r) out.push({ url: `${SITE_URL}/${r.region}/p/${e.slug}`, changeFrequency: "daily", priority: 0.7 });
    }
  } catch (e) {
    console.warn("sitemap: product list unavailable:", (e as Error).message);
  }
  return out;
}
