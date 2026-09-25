// Pure (no database import): used by the browse page on the server and by
// BrowseGrid in the browser.
import type { ProductCardData } from "./data";
import { SET_BY_CODE } from "./sets";

// The browse page ships every product in a region to the browser (filtering
// is client-side, so the page stays one cached render). Tuples instead of
// objects, and Shopify's CDN prefix abbreviated, keep that payload about half
// the size. Expanded again by expandCard() in the client.
export type CompactCard = [slug: string, name: string, type: string, setCode: string | null, img: string | null, price: number | null, inStock: number, listed: number];
const CDN = "https://cdn.shopify.com/s/files/";

export function compactCard(p: ProductCardData): CompactCard {
  const img = p.imageUrl?.startsWith(CDN) ? `~${p.imageUrl.slice(CDN.length)}` : p.imageUrl;
  return [p.slug, p.name, p.productType, p.setCode, img, p.lowestPriceCents, p.inStockStores, p.listedStores];
}

export function expandCard(c: CompactCard): ProductCardData {
  const [slug, name, productType, setCode, img, lowestPriceCents, inStockStores, listedStores] = c;
  return {
    slug,
    name,
    productType,
    setCode,
    imageUrl: img?.startsWith("~") ? `${CDN}${img.slice(1)}` : img,
    lowestPriceCents,
    inStockStores,
    listedStores,
    releaseDate: setCode ? SET_BY_CODE.get(setCode)?.releaseDate ?? null : null,
  };
}
