import { marketIndexCards } from "@/lib/browse-data";
import { lastCheckedAt } from "@/lib/data";
import { REGIONS } from "@/lib/regions";
import { browseIndexResponse, buildIndex } from "@/lib/search-index";

// GET /api/browse/<region>: the region's browse index (lib/search-index.ts), every product /<region>/sealed lists, as compact
// tuples. The header typeahead, the browse grid's filters and the recently-viewed rail load it once per page session
// (lib/index-client.ts) and do all their searching and sorting in the browser.
//
// An ISR route handler, like the pages: rendered on the first request after a deploy or an import (the importer's
// revalidatePath("/", "layout") purges it with every page), then served from the cache and the CDN for a day. So the database
// sees one whole-market read per region per import, however many visitors search. Nothing is built at deploy time (no
// static params), so a build never needs the database. /api/ is disallowed in robots.txt.
export const dynamic = "force-static";
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export async function GET(_req: Request, { params }: { params: { region: string } }) {
  return browseIndexResponse(params.region, async (region) => {
    const { market } = REGIONS[region];
    const [cards, checked] = await Promise.all([marketIndexCards(market), lastCheckedAt(market)]);
    return buildIndex(region, cards, checked);
  });
}
