// The tools' arithmetic (src/content/tools, src/components/tools): pure functions, so tests/tools.test.ts checks the numbers the pages
// print. Money is whole cents throughout; nothing here knows a price, a grading fee or a card: every input is the reader's own.

/** "12.50", "$12.50", "A$1,299", "12,50" → cents; empty or unreadable → null. */
export function parseMoney(input: string): number | null {
  const s = input.trim().replace(/[^\d.,-]/g, "");
  if (!s || /-/.test(s)) return null;
  // With both separators, the last one is the decimal point ("1.299,95", "1,299.95"); a comma alone followed by exactly two digits at
  // the end is a decimal comma ("12,50"); any other comma groups thousands.
  const decimalComma = s.includes(",") && (s.includes(".") ? s.lastIndexOf(",") > s.lastIndexOf(".") : /,\d{2}$/.test(s));
  const normal = decimalComma ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  if (!/^\d*(?:\.\d*)?$/.test(normal) || normal === ".") return null;
  const n = Number(normal);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** A percentage the reader typed: "13.4", "13.4%" → 13.4; clamped to 0–100; unreadable → null. */
export function parsePct(input: string): number | null {
  const s = input.trim().replace(/%$/, "").trim();
  if (!s || !/^\d*(?:\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
}

// ─── Trade calculator ─────────────────────────────────────────────────────────

export interface TradeItem {
  name: string;
  qty: number;
  /** The value of one, in cents. */
  cents: number;
}

export const lineTotal = (it: TradeItem): number => Math.max(0, Math.floor(it.qty)) * Math.max(0, it.cents);
export const sideTotal = (items: readonly TradeItem[]): number => items.reduce((s, it) => s + lineTotal(it), 0);

export interface TradeResult {
  giveCents: number;
  getCents: number;
  /** get − give: positive when you receive more value than you give. */
  diffCents: number;
  /** The difference as a percent of the bigger side (0 when both are empty). */
  diffPct: number;
  verdict: "even" | "you-gain" | "you-give-more" | "empty";
}

/** Within 2% of the bigger side, a trade reads as even: a rounding gap, not a lopsided deal. */
export const EVEN_WITHIN_PCT = 2;

export function tradeResult(give: readonly TradeItem[], get: readonly TradeItem[]): TradeResult {
  const g = sideTotal(give);
  const r = sideTotal(get);
  const big = Math.max(g, r);
  const diff = r - g;
  const pct = big ? (Math.abs(diff) / big) * 100 : 0;
  const verdict = big === 0 ? "empty" : pct <= EVEN_WITHIN_PCT ? "even" : diff > 0 ? "you-gain" : "you-give-more";
  return { giveCents: g, getCents: r, diffCents: diff, diffPct: pct, verdict };
}

/** What a side is worth as store credit at a shop's credit rate (percent of its value). */
export function creditValue(cents: number, ratePct: number): number {
  return Math.round((Math.max(0, cents) * Math.min(100, Math.max(0, ratePct))) / 100);
}

// ─── Grading calculator ───────────────────────────────────────────────────────

export interface GradeOutcome {
  label: string;
  /** What the card sells for in this grade (cents). */
  saleCents: number;
  /** How likely the reader thinks this grade is, in percent. */
  chancePct: number;
}

export interface GradingInput {
  /** What the card sells for ungraded (cents). */
  rawCents: number;
  /** The grading company's fee for this card (cents). */
  gradingFeeCents: number;
  /** Postage and insurance to the grader and back (cents). */
  shippingCents: number;
  /** The selling fee rate on a sale, raw or graded (percent of the sale). */
  sellFeePct: number;
  grades: readonly GradeOutcome[];
}

export interface GradeLine extends GradeOutcome {
  /** What a sale in this grade leaves after the selling fee, the grading fee and the postage. */
  netCents: number;
  /** netCents minus what selling raw leaves: positive when grading paid. */
  vsRawCents: number;
}

export interface GradingResult {
  /** What selling the card raw leaves after the selling fee. */
  rawNetCents: number;
  lines: GradeLine[];
  /** The graded sale price at which grading leaves exactly what selling raw does. */
  breakEvenCents: number | null;
  /** Each grade's net weighted by its chance (when the chances add up to more than 0), and the same against raw. */
  weightedNetCents: number | null;
  weightedVsRawCents: number | null;
  /** The chances as entered add up to this (the page warns when it is not 100). */
  chanceTotalPct: number;
}

const afterFee = (cents: number, pct: number) => cents - Math.round((cents * Math.min(100, Math.max(0, pct))) / 100);

export function gradingResult(i: GradingInput): GradingResult {
  const costs = Math.max(0, i.gradingFeeCents) + Math.max(0, i.shippingCents);
  const rawNet = afterFee(Math.max(0, i.rawCents), i.sellFeePct);
  const lines = i.grades.map((g): GradeLine => {
    const net = afterFee(Math.max(0, g.saleCents), i.sellFeePct) - costs;
    return { ...g, netCents: net, vsRawCents: net - rawNet };
  });
  const keep = 1 - Math.min(100, Math.max(0, i.sellFeePct)) / 100;
  // sale × keep − costs = rawNet  →  sale = (rawNet + costs) / keep
  const breakEven = keep > 0 ? Math.ceil((rawNet + costs) / keep) : null;
  const total = i.grades.reduce((s, g) => s + Math.max(0, g.chancePct), 0);
  const weighted = total > 0 ? Math.round(lines.reduce((s, l) => s + (l.netCents * Math.max(0, l.chancePct)) / total, 0)) : null;
  return {
    rawNetCents: rawNet,
    lines,
    breakEvenCents: breakEven,
    weightedNetCents: weighted,
    weightedVsRawCents: weighted == null ? null : weighted - rawNet,
    chanceTotalPct: total,
  };
}

// ─── Deck builder ─────────────────────────────────────────────────────────────

export type DeckSection = "pokemon" | "trainer" | "energy";

export interface DeckCard {
  section: DeckSection;
  count: number;
  /** The card's name as printed ("Pikachu ex"). */
  name: string;
  /** The set code and collector number, when the list had them ("SVI 57"). */
  set: string;
}

export const DECK_SIZE = 60;
export const MAX_COPIES = 4;

const BASIC_ENERGY = /^(?:basic\s+)?(?:grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy|dragon)\s+energy$|^basic\s+\{?[a-z]\}?\s+energy$/i;

/** Basic Energy has no copy limit; everything else four of a name. (Special Energy, "Double Turbo Energy", is limited.) */
export function isBasicEnergy(name: string): boolean {
  return BASIC_ENERGY.test(name.trim());
}

const HEADING = /^\s*(pok[eé]mon|trainers?|energy)\b[^\d]*(?::\s*\d+)?\s*$/i;
// "4 Pikachu ex SVI 57", "4 Pikachu ex SVI 57 PH", "* 4 Pikachu ex", "10 Basic {R} Energy SVE 2", "4x Ultra Ball"
const LINE = /^\s*\*?\s*(\d{1,2})\s*x?\s+(.+?)\s*$/i;
// A trailing set code and number: "SVI 57", "PAF 234", "sv8 238", "SVE 2 PH", "PR-SV 12".
const SET_TAIL = /\s+([A-Z][A-Za-z0-9]{1,5}(?:-[A-Z0-9]{1,4})?\s+[A-Za-z]{0,3}\d{1,4}[a-z]?(?:\s+[A-Z]{1,3})?)$/;

export interface ParsedDeck {
  cards: DeckCard[];
  /** Lines with a count that could not be read, verbatim, for the reader to fix. */
  unread: string[];
}

/** A pasted deck list (Pokémon TCG Live's export and most deck sites'), section headings optional. */
export function parseDeckList(text: string): ParsedDeck {
  const cards: DeckCard[] = [];
  const unread: string[] = [];
  let section: DeckSection = "pokemon";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^total\s+cards/i.test(line)) continue;
    const h = HEADING.exec(line);
    if (h) {
      const w = h[1].toLowerCase();
      section = w.startsWith("pok") ? "pokemon" : w.startsWith("trainer") ? "trainer" : "energy";
      continue;
    }
    const m = LINE.exec(line);
    if (!m) {
      unread.push(line);
      continue;
    }
    const count = Number(m[1]);
    let name = m[2];
    let set = "";
    const t = SET_TAIL.exec(name);
    if (t && t.index > 0) {
      set = t[1];
      name = name.slice(0, t.index);
    }
    name = name.trim();
    if (!name || count < 1) {
      unread.push(line);
      continue;
    }
    // A basic Energy listed before any heading still belongs with the Energy.
    const sec: DeckSection = isBasicEnergy(name) ? "energy" : section;
    cards.push({ section: sec, count, name, set });
  }
  return { cards, unread };
}

export interface DeckCheck {
  total: number;
  bySection: Record<DeckSection, number>;
  /** Names over the four-copy limit (summed across set printings), with their count. */
  overLimit: { name: string; count: number }[];
  /** Sixty exactly and nothing over the limit. */
  ok: boolean;
}

/** The counts and the copy rule. Copies are counted by name across printings, as the rules do; basic Energy is exempt. */
export function checkDeck(cards: readonly DeckCard[]): DeckCheck {
  const bySection: Record<DeckSection, number> = { pokemon: 0, trainer: 0, energy: 0 };
  const byName = new Map<string, { name: string; count: number }>();
  for (const c of cards) {
    const n = Math.max(0, Math.floor(c.count));
    bySection[c.section] += n;
    if (isBasicEnergy(c.name)) continue;
    const key = c.name.trim().toLowerCase().replace(/\s+/g, " ");
    const e = byName.get(key) ?? { name: c.name.trim(), count: 0 };
    e.count += n;
    byName.set(key, e);
  }
  const total = bySection.pokemon + bySection.trainer + bySection.energy;
  const overLimit = [...byName.values()].filter((e) => e.count > MAX_COPIES).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { total, bySection, overLimit, ok: total === DECK_SIZE && overLimit.length === 0 };
}

const SECTION_TITLE: Record<DeckSection, string> = { pokemon: "Pokémon", trainer: "Trainer", energy: "Energy" };

/** The list back out in the export format Pokémon TCG Live reads: a heading with its count per section, then a line per card. */
export function formatDeckList(cards: readonly DeckCard[]): string {
  const out: string[] = [];
  for (const sec of ["pokemon", "trainer", "energy"] as const) {
    const rows = cards.filter((c) => c.section === sec && c.count > 0);
    if (!rows.length) continue;
    if (out.length) out.push("");
    out.push(`${SECTION_TITLE[sec]}: ${rows.reduce((s, c) => s + c.count, 0)}`);
    for (const c of rows) out.push(`${c.count} ${c.name}${c.set ? ` ${c.set}` : ""}`);
  }
  if (out.length) out.push("", `Total Cards: ${cards.reduce((s, c) => s + Math.max(0, c.count), 0)}`);
  return out.join("\n");
}

// ─── Value checker ────────────────────────────────────────────────────────────

export type PricePosition = "below-cheapest" | "at-cheapest" | "below-median" | "around-median" | "above-median" | "above-cheapest";

/**
 * Where a price the reader was offered sits against today's store prices: under the cheapest in-stock store, at it (within 1%),
 * between it and the median, around the median (within 3%), or above it. Without a median (fewer than two stores in stock), only
 * against the cheapest.
 */
export function pricePosition(offerCents: number, cheapestCents: number, medianCents: number | null): PricePosition {
  const near = (a: number, b: number, pct: number) => Math.abs(a - b) <= (b * pct) / 100;
  if (near(offerCents, cheapestCents, 1)) return "at-cheapest";
  if (offerCents < cheapestCents) return "below-cheapest";
  if (medianCents == null || medianCents <= cheapestCents) return "above-cheapest";
  if (near(offerCents, medianCents, 3)) return "around-median";
  return offerCents < medianCents ? "below-median" : "above-median";
}
