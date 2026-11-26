// Products the low-traction cull left out (lib/focus.ts, owner 2026-11-07). The exporter writes data/public/culled.json (product
// slug → its type page's slug, "" for none) so a culled product's old URL 301s to its type page in the same region instead of a 404.
// A product that qualifies again leaves the file and gets its page back at the same URL. An entry "p:<slug>" is a product whose
// listings now sit on another product's page (lib/focus.ts mergedInto): its URL goes to that page.
import fs from "node:fs";
import path from "node:path";

let map: Record<string, string> | null = null;

/** Where a culled product's URL goes in this region, or null when the slug was never culled. */
export function culledTarget(slug: string, region: string): string | null {
  if (!map) {
    try {
      map = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "public", "culled.json"), "utf8")) as Record<string, string>;
    } catch {
      map = {};
    }
  }
  if (!Object.prototype.hasOwnProperty.call(map, slug)) return null;
  const to = map[slug];
  if (to.startsWith("p:")) return `/${region}/p/${to.slice(2)}`;
  return to ? `/${region}/type/${to}` : `/${region}`;
}
