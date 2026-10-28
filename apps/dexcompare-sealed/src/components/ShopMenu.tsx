import { featureOrder } from "@/lib/release";
import type { Region } from "@/lib/regions";
import { SET_BY_CODE, SETS } from "@/lib/sets";
import { sectionHref, type SectionKey } from "@/lib/site";

export type MenuLink = { href: string; label: string };
export type MenuColumn = { title: string; links: MenuLink[] };

/**
 * The desktop "All sealed" dropdown's columns (lg and up), category-first like the big skin and card marketplaces: what kind of
 * product, which set, and the value pages. The same destinations the phone menu and the footer already link, so it adds no page
 * and no read: a static list (sets from lib/sets.ts, in release.ts featureOrder: the newest released set first, never a pre-order).
 * Pure, so the tests pin it.
 */
export function shopMenuColumns(region: Region, today: string = new Date().toISOString().slice(0, 10)): MenuColumn[] {
  const s = (key: SectionKey, label: string): MenuLink => ({ href: sectionHref(region, key), label });
  const type = (slug: string, label: string): MenuLink => ({ href: `/${region}/type/${slug}`, label });
  const sets = featureOrder(SETS.slice(0, 7).map((x) => x.code), today)
    .map((c) => SET_BY_CODE.get(c)!)
    .map((set) => ({ href: `/${region}/sets/${set.slug}`, label: set.releaseDate > today ? `${set.name} (pre-order)` : set.name }));
  return [
    {
      title: "By product",
      links: [
        s("boosterBoxes", "Booster boxes"),
        s("etbs", "Elite Trainer Boxes"),
        type("pokemon-center-elite-trainer-boxes", "Pokémon Center ETBs"),
        s("bundles", "Booster bundles"),
        s("upcs", "Ultra-Premium Collections"),
        type("collections", "Collections & boxes"),
        s("tins", "Tins"),
        type("booster-packs", "Booster packs"),
        s("japanese", "Japanese boxes"),
      ],
    },
    { title: "By set", links: [...sets, s("sets", "Every set →")] },
    {
      title: "By value",
      links: [s("perPack", "Cheapest per pack"), s("backInStock", "Back in stock"), s("priceMoves", "Price moves"), s("outOfPrint", "Older sets in stock"), s("sealed", "Browse & filter all →")],
    },
  ];
}
