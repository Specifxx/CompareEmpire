// Product photos are the stores' own, hotlinked (never proxied through Vercel's
// metered image optimiser). Shopify's CDN resizes on request, so grids ask for
// a small rendition instead of the multi-megabyte original.
export function thumb(url: string | null | undefined, width = 400): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("//") ? `https:${url}` : url);
    if (/(^|\.)cdn\.shopify\.com$/.test(u.hostname) || u.pathname.includes("/cdn/shop/")) {
      u.searchParams.set("width", String(width));
    }
    return u.toString();
  } catch {
    return url;
  }
}
