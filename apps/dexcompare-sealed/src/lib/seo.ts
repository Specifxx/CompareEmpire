import type { Metadata } from "next";
import { REGION_LIST, REGIONS, X_DEFAULT_REGION, xDefaultRegion, isRegion, type Region, type RegionInfo } from "./regions";
import { CONTACT_EMAIL, SITE_NAME, SITE_TAGLINE, SITE_URL, SOCIAL_LINKS } from "./site";

/**
 * JSON-LD for a <script> tag. Store titles flow into this, so "<" is escaped:
 * a title containing "</script>" must not be able to close the tag.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

/**
 * Canonical + hreflang alternates for a page that exists at /<region><rest>.
 * Two call shapes, same result:
 *   regionAlternates("/au/p/slug", regions?)      — the page's own path
 *   regionAlternates("au", "/p/slug", regions?)   — region + rest
 *
 * `regions` is the set of regions to ADVERTISE — pass only the ones where this
 * page is indexable (a product's regions with a comparable listing, say), as
 * codes or RegionInfos. The default is all seven, right for pages that always
 * have content (region home, /sealed, /sets, /stores). The page's own region
 * is always included. x-default is the landing page (the region chooser) for
 * a region home, and otherwise the US copy when it is advertised
 * (xDefaultRegion) — never a copy the page is not indexable in.
 */
export function regionAlternates(path: string, regions?: ReadonlyArray<Region | RegionInfo>): Metadata["alternates"];
export function regionAlternates(region: Region, rest: string, regions?: ReadonlyArray<Region | RegionInfo>): Metadata["alternates"];
export function regionAlternates(a: string, b?: string | ReadonlyArray<Region | RegionInfo>, c?: ReadonlyArray<Region | RegionInfo>): Metadata["alternates"] {
  let region: string;
  let rest: string;
  let regions: ReadonlyArray<Region | RegionInfo>;
  if (typeof b === "string") {
    region = a;
    rest = b;
    regions = c ?? REGION_LIST;
  } else {
    const [first, ...more] = a.split("/").filter(Boolean);
    region = first ?? "";
    rest = more.length ? `/${more.join("/")}` : "";
    regions = b ?? REGION_LIST;
  }
  if (!isRegion(region)) return { canonical: `${SITE_URL}${a.startsWith("/") ? a : `/${a}`}` };
  const codes = regions.map((r) => (typeof r === "string" ? r : r.region)).filter(isRegion);
  if (!codes.includes(region)) codes.unshift(region);
  const languages: Record<string, string> = {};
  for (const r of REGION_LIST) if (codes.includes(r.region)) languages[r.hreflang] = `${SITE_URL}/${r.region}${rest}`;
  languages["x-default"] = rest ? `${SITE_URL}/${xDefaultRegion(codes)}${rest}` : `${SITE_URL}/`;
  return { canonical: `${SITE_URL}/${region}${rest}`, languages };
}

export function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
  alternates?: Metadata["alternates"];
  image?: string | null;
  noindex?: boolean;
  /**
   * og:type. "product" is not in Next's openGraph union, so it goes out through
   * `other` and openGraph carries no `type` key at all — a `type: undefined`
   * key makes Next's generator throw "Invalid OpenGraph type: undefined" and
   * the page 500.
   */
  ogType?: "website" | "product";
}): Metadata {
  const product = opts.ogType === "product";
  return {
    title: opts.title,
    description: opts.description,
    alternates: opts.alternates ?? { canonical: `${SITE_URL}${opts.path}` },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: `${SITE_URL}${opts.path}`,
      siteName: SITE_NAME,
      ...(product ? {} : { type: "website" }),
      ...(opts.image ? { images: [{ url: opts.image }] } : {}),
    },
    ...(product ? { other: { "og:type": "product" } } : {}),
    twitter: { card: opts.image ? "summary_large_image" : "summary", title: opts.title, description: opts.description },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

// ─── JSON-LD builders ────────────────────────────────────────────────────────
// One place for the shapes, so every page says the same thing about the site.
// Each returns a plain object; render with jsonLd() inside a <script>.

export const ORG_ID = `${SITE_URL}/#org`;
export const WEBSITE_ID = `${SITE_URL}/#site`;

export function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    description: SITE_TAGLINE,
    contactPoint: { "@type": "ContactPoint", email: CONTACT_EMAIL, contactType: "customer support", url: `${SITE_URL}/contact` },
    ...(SOCIAL_LINKS.length ? { sameAs: SOCIAL_LINKS } : {}),
  };
}

// The site search is per region (/<region>/sealed?q=); the x-default region's
// is the one to advertise.
export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/${X_DEFAULT_REGION}/sealed?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** The root layout's graph: Organization + WebSite, once per page. */
export function siteJsonLd() {
  return { "@context": "https://schema.org", "@graph": [organizationJsonLd(), websiteJsonLd()] };
}

export function breadcrumbJsonLd(items: { href?: string; label: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      ...(it.href ? { item: `${SITE_URL}${it.href}` } : {}),
    })),
  };
}

/**
 * A product page's Product + AggregateOffer, from the region's OPEN listings
 * only (in stock or pre-order, in the region's currency). Never TCGplayer's
 * US$ offer outside the US, and never a sold-out price: the page shows none
 * when nothing is open, and so does this.
 */
export function productJsonLd(p: {
  name: string;
  path: string; // "/au/p/<slug>"
  image?: string | null;
  productType: string;
  setName?: string | null;
  currency: string;
  lowCents: number;
  highCents: number;
  offerCount: number;
  preorder?: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    ...(p.image ? { image: p.image } : {}),
    brand: { "@type": "Brand", name: "Pokémon" },
    category: `Pokémon TCG ${p.productType}`,
    ...(p.setName ? { isRelatedTo: { "@type": "Thing", name: p.setName } } : {}),
    url: `${SITE_URL}${p.path}`,
    offers: {
      "@type": "AggregateOffer",
      url: `${SITE_URL}${p.path}`,
      priceCurrency: p.currency,
      lowPrice: (p.lowCents / 100).toFixed(2),
      highPrice: (p.highCents / 100).toFixed(2),
      offerCount: p.offerCount,
      availability: p.preorder ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
    },
  };
}

/**
 * An ItemList for a set, type or browse page: the products it lists, in the
 * order shown. Cap it (the first 50 is plenty for a crawler) — the page's grid
 * is the full list.
 */
export function itemListJsonLd(opts: { name: string; path: string; items: { path: string; name: string; image?: string | null }[]; take?: number }) {
  const items = opts.items.slice(0, opts.take ?? 50);
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: opts.name,
    url: `${SITE_URL}${opts.path}`,
    numberOfItems: opts.items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}${it.path}`,
      name: it.name,
      ...(it.image ? { image: it.image } : {}),
    })),
  };
}

/** The region a path's first segment names, if any: "/au/sets" → REGIONS.au. */
export function regionOfPath(pathname: string): RegionInfo | null {
  const first = pathname.split("/").filter(Boolean)[0];
  return isRegion(first) ? REGIONS[first] : null;
}
