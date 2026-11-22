// Product photos are the stores' own, hotlinked (never proxied through Vercel's
// metered image optimiser). Shopify's CDN resizes on request, so grids ask for
// a small rendition instead of the multi-megabyte original. TCGplayer's CDN
// serves fixed square renditions (200, 400, 1000 px): the smallest that covers
// the width is used.
export function thumb(url: string | null | undefined, width = 400): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("//") ? `https:${url}` : url);
    if (/(^|\.)cdn\.shopify\.com$/.test(u.hostname) || u.pathname.includes("/cdn/shop/")) {
      u.searchParams.set("width", String(width));
    }
    const tcg = u.hostname === "tcgplayer-cdn.tcgplayer.com" && u.pathname.match(/^(\/product\/\d+)_in_\d+x\d+\.jpg$/);
    if (tcg) {
      const side = width <= 200 ? 200 : width <= 400 ? 400 : 1000;
      u.pathname = `${tcg[1]}_in_${side}x${side}.jpg`;
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * A srcset of CDN renditions for a responsive <img> (with `sizes`), or null
 * when the host can't resize — then a srcset would just repeat one URL.
 */
export function thumbSet(url: string | null | undefined, widths: number[]): string | null {
  if (!url) return null;
  const first = thumb(url, widths[0]);
  if (!first || first === thumb(url, widths[widths.length - 1])) return null;
  return widths.map((w) => `${thumb(url, w)} ${w}w`).join(", ");
}

/** Grid cards: a phone shows two across, a desktop four of ~280px. */
export const CARD_SIZES = "(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw";

// eBay photo URLs carry their size in the last path segment (/images/g/<id>/s-l500.jpg); the same photo exists at other sizes.
const EBAY_SIZE_RE = /^(\/images\/g\/[A-Za-z0-9~_-]+\/)s-l(\d{2,4})(\.[a-z]{3,4})$/;

/**
 * The same eBay photo at a SMALLER stored size, for tiles much narrower than the strip: the ad banners' tiles are 104-120 CSS px,
 * so 300 px covers a 2.5x phone screen, and the stored s-l500 sent about 300-540 KiB more per phone page view than it shows
 * (Lighthouse on dexcompare.io, 2026-11-22). Never upsizes, never touches another URL shape, keeps https + *.ebayimg.com.
 */
export function shrinkImage(url: string, width = 300): string {
  try {
    const u = new URL(url);
    const m = EBAY_SIZE_RE.exec(u.pathname);
    if (!m || !/(^|\.)ebayimg\.com$/i.test(u.hostname) || Number(m[2]) <= width) return url;
    u.pathname = `${m[1]}s-l${width}${m[3]}`;
    return u.toString();
  } catch {
    return url;
  }
}
