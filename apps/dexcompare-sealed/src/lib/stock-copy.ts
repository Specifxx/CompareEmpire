// Titles and descriptions of the stock pages (/back-in-stock, /price-moves, /out-of-print), ported from MTG Compare's seo-titles.ts
// (2026-10-25). Titles are plain text for deals.ts fitTitle (the layout's suffix when it fits); descriptions at most 160 characters.
// Every number is the caller's, from the page's own data. Pure.
import { plural } from "./format";
import type { RegionInfo } from "./regions";

type R = Pick<RegionInfo, "inName" | "adjective" | "market" | "currency">;
export const DESCRIPTION_MAX = 160;

/** The first description that fits in 160 characters, else the last cut at a word. */
export function fitDescription(...c: string[]): string {
  const fit = c.find((x) => x.length <= DESCRIPTION_MAX);
  if (fit) return fit;
  const cut = c[c.length - 1].slice(0, DESCRIPTION_MAX - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,:;–—-]+$/, "")}…`;
}

export const stockCopy = {
  backTitle: (r: R) => `Pokémon sealed back in stock in ${r.inName}`,
  backDescription: (r: R, n: number) =>
    fitDescription(
      n > 0
        ? `${plural(n, "Pokémon sealed product")} that ${r.adjective} stores had none of in one daily check and have in stock again in the next: booster boxes, ETBs, bundles.`
        : `Pokémon sealed product that ${r.adjective} stores had none of in one daily check and have in stock again in the next, from DexCompare's daily snapshots.`,
    ),
  movesTitle: (r: R) => `Pokémon booster box price moves this week in ${r.inName}`,
  movesDescription: (r: R) =>
    fitDescription(
      `The week's biggest changes in the cheapest in-stock price of popular sets' booster boxes, ETBs and bundles across ${r.adjective} stores, up and down, in ${r.currency}.`,
      `The week's biggest changes in the cheapest in-stock price of popular Pokémon sets' sealed product in ${r.inName}.`,
    ),
  oopTitle: (r: R) => `Older Pokémon sets still in stock in ${r.inName}`,
  oopDescription: (r: R, sets: number) =>
    fitDescription(`Booster boxes, Elite Trainer Boxes and bundles from ${plural(sets, "older Pokémon set")} that ${r.adjective} stores still have in stock today, by how many stores carry them.`),
};
