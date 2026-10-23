// What the booster-box guides of the SEO sprint (2026-10-23) share: the market's open booster boxes (data.ts openBoxes, cheapest
// first) split into released and pre-order, the cheapest box of each set, and the table that lists them. Pure but for the JSX.
import Link from "next/link";
import type { ProductCardData } from "@/lib/data";
import { money } from "@/lib/format";
import { packsForLabel, perPackCents } from "@/lib/packs";
import type { RegionInfo } from "@/lib/regions";
import { SET_BY_CODE, SETS, type PokemonSet } from "@/lib/sets";
import { productHref, setHref, StackTable, whereText } from "./kit";

export const BOX = "Booster Box";

export interface BoxRow {
  p: ProductCardData;
  set: PokemonSet;
  perPack: number | null;
  preorder: boolean;
}

/** Every open booster box with a known set, cheapest first, released and pre-order told apart by the set's release date. */
export function boxRows(cards: readonly ProductCardData[], today: string): BoxRow[] {
  const out: BoxRow[] = [];
  for (const p of cards) {
    const set = p.setCode ? SET_BY_CODE.get(p.setCode) : undefined;
    if (!set || p.productType !== BOX || !p.lowestPriceCents) continue;
    out.push({ p, set, perPack: perPackCents(p.lowestPriceCents, packsForLabel(BOX, set.code, p.name)), preorder: set.releaseDate > today });
  }
  return out.sort((a, b) => a.p.lowestPriceCents! - b.p.lowestPriceCents! || a.p.slug.localeCompare(b.p.slug));
}

/** The cheapest box of each set, sets newest first (sets.ts order). */
export function cheapestBySet(rows: readonly BoxRow[]): BoxRow[] {
  const best = new Map<string, BoxRow>();
  for (const x of rows) if (!best.has(x.set.code)) best.set(x.set.code, x);
  return SETS.map((s) => best.get(s.code)).filter((x): x is BoxRow => !!x);
}

export const median = (xs: readonly number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/** A table of boxes: the box (linked to its comparison page) and its set, the price, the price per pack and where it is open. */
export function BoxTable({ r, rows, caption, whereHead = "In stock at" }: { r: RegionInfo; rows: readonly BoxRow[]; caption: string; whereHead?: string }) {
  return (
    <StackTable
      caption={caption}
      head={["Booster box", "Price", "Per pack", whereHead]}
      rows={rows.map((x) => ({
        key: x.p.slug,
        type: "booster-box",
        th: (
          <span className="flex min-w-0 flex-col gap-0.5">
            <Link href={productHref(r, x.p)} prefetch={false} className="font-semibold text-ink hover:text-brand hover:underline">
              {x.p.name}
            </Link>
            <Link href={setHref(r, x.set)} prefetch={false} className="truncate text-xs font-medium text-brand underline-offset-2 hover:underline">
              All {x.set.name} sealed
            </Link>
          </span>
        ),
        cells: [
          <span key="p" className="font-semibold">
            {money(x.p.lowestPriceCents, r.market)}
          </span>,
          <span key="pp">{x.perPack != null ? money(x.perPack, r.market) : "—"}</span>,
          <span key="w" className="text-muted">
            {whereText(x.p)}
          </span>,
        ],
      }))}
    />
  );
}
