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
