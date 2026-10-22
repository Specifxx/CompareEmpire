// The /go redirect's checks (src/app/go/route.ts): server only (it reads the store registry). Pure; tests/click-events.test.ts.
// lib/click-events.ts builds the URL (goHref) and says why /go exists.
import { PLACEMENTS, TCGPLAYER_KEY, type Placement } from "./affiliate";
import { ANALYTICS_PROPS, pageTypeOfPlacement, type AnalyticsEvent, type GoParams } from "./click-events";
import { isRegion } from "./regions";
import { STORE_BY_KEY } from "./stores";

const host = (u: string): string | null => {
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:" ? x.hostname.toLowerCase().replace(/^www\./, "") : null;
  } catch {
    return null;
  }
};

/** TCGplayer's own host and its Impact partner host (affiliate.ts tcgplayerAffiliateUrl). */
const TCGPLAYER_HOSTS = ["tcgplayer.com", "partner.tcgplayer.com"];

/** May /go send a visitor from store `store` to `dest`? Only to that store's own host (or a subdomain of it); TCGplayer to its two. */
export function goAllowed(store: string, dest: string): boolean {
  const h = host(dest);
  if (!h) return false;
  if (store === TCGPLAYER_KEY) return TCGPLAYER_HOSTS.some((t) => h === t || h.endsWith(`.${t}`));
  const s = STORE_BY_KEY.get(store);
  const b = s ? host(s.base) : null;
  return !!b && (h === b || h.endsWith(`.${b}`));
}

const PLACEMENT_SET: ReadonlySet<string> = new Set(PLACEMENTS);
const int = (v: string | null): number | undefined => (v && /^\d{1,9}$/.test(v) ? Number(v) : undefined);

/** A /go request's parameters, checked: null when anything is missing, unknown or not allowed. */
export function parseGo(search: URLSearchParams): GoParams | null {
  const dest = search.get("u") ?? "";
  const store = search.get("s") ?? "";
  const region = search.get("r");
  const placement = search.get("pl") ?? "";
  if (!dest || !store || !isRegion(region) || !PLACEMENT_SET.has(placement) || !goAllowed(store, dest)) return null;
  const product = search.get("p") ?? undefined;
  return {
    dest,
    store,
    region,
    placement: placement as Placement,
    product: product && /^[a-z0-9-]{1,200}$/.test(product) ? product : undefined,
    priceCents: int(search.get("c")),
    position: int(search.get("n")),
  };
}

/** The server-side event a /go click records: "go_click", with the same two-or-eight rule as the browser's. */
export function goEvent(p: GoParams, props = ANALYTICS_PROPS): AnalyticsEvent {
  if (props >= 8) {
    return [
      "go_click",
      {
        product: p.product ?? null,
        store: p.store,
        region: p.region,
        price: p.priceCents != null ? p.priceCents / 100 : null,
        position: p.position ?? null,
        page: pageTypeOfPlacement(p.placement),
        affiliate: p.store === TCGPLAYER_KEY,
        placement: p.placement,
      },
    ];
  }
  return ["go_click", { store: p.store, placement: p.placement }];
}

