import { contextHeading } from "@/lib/ebay-context";
import { parseContext } from "@/lib/ebay-context-parse";
import { ebayListingsEnabled } from "@/lib/ebay-listings";
import { EbayListingsStrip, type EbayListingsStripProps } from "./EbayListings";

/**
 * Server wrapper: reads whether listings are switched on (EBAY_CLIENT_ID and
 * EBAY_CLIENT_SECRET set, EBAY_LISTINGS not "off": presence only, the values never leave the
 * server) and hands the island a boolean. On an ISR page this is evaluated when the page is
 * rendered; no listing is ever baked into a page, only whether to look for them in the
 * browser. Switched off, the island renders its fallback on the server and fetches nothing.
 *
 * It also resolves the context on the server (the browser never imports the sets table): the
 * heading ("Chase cards from <set> on eBay", or the generic one for an unreleased or series-named
 * set, whose context is the generic one: ebay-context-parse.ts) and what "See more" searches for.
 * An unknown context renders just the fallback.
 */
export function ListingsStrip(props: Omit<EbayListingsStripProps, "enabled">) {
  const parsed = parseContext(props.context);
  if (!parsed) return props.fallback ? <div className={props.className}>{props.fallback}</div> : null;
  const heading = props.heading ?? contextHeading(parsed);
  const searchQuery = props.searchQuery ?? (parsed.setName ? `${parsed.setName} special illustration rare` : "special illustration rare");
  return <EbayListingsStrip enabled={ebayListingsEnabled()} {...props} heading={heading} searchQuery={searchQuery} />;
}
