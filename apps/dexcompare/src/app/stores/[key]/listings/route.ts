import { RETAILERS, retailerCountry } from "@/lib/retailers";
import { storeStats } from "@/lib/store-stats";
import { parsePageNum, parsePageSize } from "@/lib/cards";

// Paged in-stock listings for one store, as JSON.
//
// Why this exists: /stores/[key] declared `export const revalidate` but read
// `searchParams` (page/size), and in Next 14 searchParams is a dynamic API — so
// the route was excluded from the prerender manifest entirely and every request
// (Googlebot included) re-ran storeStats() against Postgres. The page now
// renders the searchParams-free page 1 and is genuinely ISR-cached; deeper pages
// are fetched from here by the <StoreListings> client island.
//
// Deep pages were already noindex (they only ever served humans clicking
// "Next"), so serving them from a CDN-cached JSON endpoint is strictly cheaper
// than the old per-request full-page SSR.
export const revalidate = 3600;

// Same window the page uses for its own cached first page.
const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(req: Request, { params }: { params: { key: string } }) {
  const store = RETAILERS[params.key];
  if (!store) {
    return Response.json({ error: "unknown_store" }, { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  }

  const url = new URL(req.url);
  const page = parsePageNum(url.searchParams.get("page") ?? undefined);
  const size = parsePageSize(url.searchParams.get("size") ?? undefined);

  const stats = await storeStats(params.key, retailerCountry(params.key));
  const rows = stats.rows.slice((page - 1) * size, (page - 1) * size + size);

  return Response.json(
    { rows, totalRows: stats.rows.length, page, size },
    {
      headers: {
        "Cache-Control": CACHE_CONTROL,
        // A JSON slice of a page that already exists in HTML — never an index target.
        "X-Robots-Tag": "noindex",
      },
    }
  );
}
