// Products the low-traction cull left out (lib/focus.ts, owner 2026-11-07). The exporter writes data/public/culled.json (product
// slug → its type page's slug, "" for none) so a culled product's old URL 301s to its type page in the same region instead of a 404.
// A product that qualifies again leaves the file and gets its page back at the same URL. An entry "p:<product>:<type>" is a
// product whose listings now sit on another product's page (lib/focus.ts mergedInto): the page 301s there when that product is
// listed in the visitor's region (mergedTarget), and to the type page otherwise (culledTarget).
import fs from "node:fs";
import path from "node:path";

let map: Record<string, string> | null = null;

/** Where a culled product's URL goes in this region, or null when the slug was never culled. */
function load(): Record<string, string> {
  if (!map) {
    try {
      map = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "public", "culled.json"), "utf8")) as Record<string, string>;
    } catch {
      map = {};
    }
  }
  return map;
}

export function culledTarget(slug: string, region: string): string | null {
  const m = load();
  if (!Object.prototype.hasOwnProperty.call(m, slug)) return null;
  const v = m[slug];
  const to = v.startsWith("p:") ? v.split(":")[2] ?? "" : v;
  return to ? `/${region}/type/${to}` : `/${region}`;
}

/** The product a culled product's listings moved to (a "p:" entry), or null. The caller checks it is listed in the region. */
export function mergedTarget(slug: string): string | null {
  const m = load();
  if (!Object.prototype.hasOwnProperty.call(m, slug)) return null;
  const v = m[slug];
  return v.startsWith("p:") ? v.split(":")[1] || null : null;
}
