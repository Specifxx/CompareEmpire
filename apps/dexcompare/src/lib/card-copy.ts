// Data-driven, per-card copy: FAQPage entries and the "About this card" prose
// block. No price history is available (see the storage-discipline constraint
// on this app), so — unlike RiftCompare's version of this copy — there is
// deliberately no trading-range/trend sentence here.

export interface CardCopyInput {
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  domain: string; // energy type: Fire, Water, Psychic, Colorless, ...
  type: string; // supertype: Pokémon, Trainer, Energy
  rarity: string;
  might: number | null; // HP, when the card has one
  isPromo: boolean;
  headlineCents: number | null;
  headlineLabel: string; // "Cheapest price" | "Normal from" | "✦ Holo from" | ...
  storeCount: number;
  otherPrintingsCount: number;
  guideCents: number | null;
  guideIsReal: boolean;
  fmt: (cents: number) => string;
  adjective: string; // "Australian" | "US" | "UK" ...
}

// Deterministic 0..n-1 index from a string — same card always gets the same
// template on every ISR regeneration, so copy doesn't flap between rebuilds.
function seedIndex(key: string, n: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % n;
}

export function buildAboutCard(seedKey: string, c: CardCopyInput): string {
  const isPokemon = c.type === "Pokémon";
  const hp = isPokemon && c.might != null ? `, ${c.might} HP` : "";
  const domainClause = isPokemon && c.domain !== "Colorless" ? ` It's a ${c.domain}-type card.` : "";
  const promoClause = c.isPromo ? " This is a promotional printing." : "";

  const priceClause = (() => {
    if (c.headlineCents == null) {
      return `We're still tracking down live listings for ${c.name} — check back soon, or add it to your wishlist to be notified.`;
    }
    const label = c.headlineLabel.replace("✦ ", "").replace(" from", "").toLowerCase();
    return `The cheapest ${label === "cheapest price" ? "" : label + " "}copy right now is ${c.fmt(c.headlineCents)}, across ${c.storeCount} ${c.storeCount === 1 ? "store" : "stores"} we track.`;
  })();

  const guideClause = (() => {
    if (!c.guideIsReal || c.guideCents == null || c.headlineCents == null) return "";
    const pct = Math.round(((c.headlineCents - c.guideCents) / c.guideCents) * 100);
    if (Math.abs(pct) < 3) return " That's in line with its TCGplayer market guide price.";
    return pct < 0
      ? ` That's ${Math.abs(pct)}% under its TCGplayer market guide price.`
      : ` That's ${pct}% over its TCGplayer market guide price.`;
  })();

  const printingsClause =
    c.otherPrintingsCount > 0
      ? ` ${c.name} has ${c.otherPrintingsCount} other tracked ${c.otherPrintingsCount === 1 ? "printing" : "printings"} — sometimes a different one is cheaper.`
      : "";

  const templates = [
    `${c.name} is a ${c.rarity.toLowerCase()} ${c.type.toLowerCase()} card from ${c.setName} (${c.setCode} ${c.collectorNumber})${hp}.${domainClause}${promoClause} ${priceClause}${guideClause}${printingsClause}`,
    `From the ${c.setName} set, ${c.name} (${c.collectorNumber}) is a ${c.rarity.toLowerCase()} ${c.type.toLowerCase()} card${hp}.${promoClause} ${priceClause}${guideClause}${printingsClause}`,
    `Looking to buy ${c.name}? This ${c.rarity.toLowerCase()} printing comes from ${c.setName} (${c.setCode}), numbered ${c.collectorNumber}${hp}.${domainClause} ${priceClause}${guideClause}${printingsClause}`,
    `${c.name} — ${c.setName} #${c.collectorNumber} — is a ${c.rarity.toLowerCase()} ${c.type.toLowerCase()} card${hp}.${promoClause}${domainClause} ${priceClause}${guideClause}${printingsClause}`,
    `A ${c.rarity.toLowerCase()} ${c.type.toLowerCase()} from ${c.setName}, ${c.name} carries collector number ${c.collectorNumber}${hp}.${domainClause}${promoClause} ${priceClause}${guideClause}${printingsClause}`,
    `${c.name} (${c.setCode} ${c.collectorNumber}) is one of the ${c.rarity.toLowerCase()} cards in ${c.setName}${hp}.${domainClause}${promoClause} ${priceClause}${guideClause}${printingsClause}`,
  ];

  return templates[seedIndex(seedKey, templates.length)].replace(/\s+/g, " ").trim();
}

export interface CardFaq {
  q: string;
  a: string;
}

export function buildCardFaqs(c: CardCopyInput): CardFaq[] {
  const costAnswer =
    c.headlineCents != null
      ? `The cheapest live price for ${c.name} is ${c.fmt(c.headlineCents)}, across ${c.storeCount} ${c.storeCount === 1 ? "store" : "stores"} DexCompare tracks in ${c.adjective} stores.${
          c.guideIsReal && c.guideCents != null ? ` TCGplayer's market guide price is ${c.fmt(c.guideCents)}.` : ""
        }`
      : `We don't have a live store price for ${c.name} yet.${
          c.guideIsReal && c.guideCents != null ? ` TCGplayer's market guide price is ${c.fmt(c.guideCents)}.` : " Check back soon — prices refresh regularly."
        }`;

  const setAnswer = `${c.name} is from ${c.setName} (set code ${c.setCode}), collector number ${c.collectorNumber}.`;

  const whereAnswer =
    c.headlineCents != null
      ? `You can buy ${c.name} from any of the ${c.storeCount} stores DexCompare compares — the price table above is sorted cheapest first, including postage where we know it.`
      : `DexCompare hasn't matched a live listing for ${c.name} yet — search eBay from this page, or check back soon as our price feeds refresh regularly.`;

  const printingsAnswer =
    c.otherPrintingsCount > 0
      ? `Yes — ${c.name} has ${c.otherPrintingsCount} other tracked ${c.otherPrintingsCount === 1 ? "printing" : "printings"} across other sets and promos. See "Other printings" below — sometimes a different printing is cheaper.`
      : `${c.name} doesn't have any other printings currently tracked on DexCompare.`;

  return [
    { q: `How much does ${c.name} cost?`, a: costAnswer },
    { q: `What set is ${c.name} from?`, a: setAnswer },
    { q: `Where can I buy ${c.name}?`, a: whereAnswer },
    { q: `Does ${c.name} have other printings?`, a: printingsAnswer },
  ];
}

// ---- Card finish (Normal / Holo / Reverse Holo) -----------------------------
// The schema has no dedicated finish column — only a binary `isFoil` — and
// there's no per-listing source data reliable enough to add one without an
// importer change. Reverse Holo is inferred from the store listing's own
// title text (the same technique already used for the foreign-listing flag
// just above this in the card page), and is DELIBERATELY conservative: when
// the title gives no signal, a foil row is labelled plain "Holo" rather than
// guessed as Reverse Holo.
const REVERSE_HOLO_RE = /reverse[\s-]?holo|\brev\.?\s?holo\b|\brh\b/i;

export type CardFinish = "Normal" | "Holo" | "Reverse Holo";

export function cardFinish(title: string | null, isFoil: boolean): CardFinish {
  if (title && REVERSE_HOLO_RE.test(title)) return "Reverse Holo";
  if (isFoil) return "Holo";
  return "Normal";
}
