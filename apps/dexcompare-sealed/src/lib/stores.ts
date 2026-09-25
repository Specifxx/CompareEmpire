// The store registry: every store DexCompare reads, with the collections that
// hold its Pokémon sealed stock. Lives in src/data/stores.json so the probe
// (scripts/probe-stores.ts) can regenerate it and a human can edit it.
//
// A store is only listed after the probe has read it live and found Pokémon
// sealed product priced in the market's own currency. See README.md, "Adding a
// store".
import raw from "@/data/stores.json";
import { regionOfMarket, type Market } from "./regions";

export interface StoreConfig {
  key: string; // stable URL key: /<region>/stores/<key>
  name: string;
  base: string; // https origin, no trailing slash
  market: Market;
  platform: "shopify" | "woocommerce";
  // ISO country sent as Shopify's ?country= so a Markets-enabled store prices
  // in its own currency (see shopifyMeta in feeds.ts). The shop's home country
  // from /meta.json; for EU stores it is the store's own eurozone country.
  country: string;
  // Shopify collection handles / WooCommerce category slugs to read, best first.
  // Non-Pokémon collections (e.g. "pre-orders") are read strictly: a title
  // there must say "Pokémon" outright.
  collections: string[];
}

export const STORES: StoreConfig[] = (raw as StoreConfig[]).slice().sort((a, b) => a.name.localeCompare(b.name));
export const STORE_BY_KEY = new Map(STORES.map((s) => [s.key, s]));

export function storesInMarket(market: string): StoreConfig[] {
  return STORES.filter((s) => s.market === market);
}

/** The currency a store charges in: its market's. The probe verified it; the importer re-checks it. */
export function storeCurrency(s: StoreConfig): string {
  return regionOfMarket(s.market)!.currency;
}

export function storeHost(s: StoreConfig): string {
  return s.base.replace(/^https?:\/\/(www\.)?/, "");
}
