import Link from "next/link";
import { COUNTRY_GUIDE } from "@/content/guides/country-prices";
import { openPreorderGuides } from "@/lib/preorder-guides";
import { newestReleasedSet } from "@/lib/release";

/**
 * The landing page's direct links to the pages people search for (2026-11-08). Google crawls this site's home page and little
 * else, and the pages Bing already ranks (the newest set in each big region, the open pre-order, cheapest packs, the value
 * checker, the sale page) were three clicks down. One plain, server-rendered list, every link a page that exists and is indexed.
 */
export function popularLinks(today = new Date().toISOString().slice(0, 10)): { href: string; label: string }[] {
  const set = newestReleasedSet(today);
  const pre = openPreorderGuides(today)[0]?.set ?? null;
  return [
    ...(set
      ? [
          { href: `/us/sets/${set.slug}`, label: `${set.name} prices (US)` },
          { href: `/ca/sets/${set.slug}`, label: `${set.name} prices (Canada)` },
          { href: `/au/sets/${set.slug}`, label: `${set.name} prices (Australia)` },
          { href: `/uk/sets/${set.slug}`, label: `${set.name} prices (UK)` },
        ]
      : []),
    ...(pre ? [{ href: `/us/preorders/${pre.slug}`, label: `${pre.name} pre-orders` }] : []),
    { href: "/us/cheapest-packs", label: "Cheapest Pokémon packs, by price per pack" },
    { href: "/us/guides/cheapest-way-to-buy-pokemon-packs", label: "The cheapest way to buy Pokémon packs" },
    { href: "/us/black-friday", label: "Pokémon Black Friday prices" },
    { href: "/us/tools/value-checker", label: "Sealed value checker" },
    { href: COUNTRY_GUIDE.path, label: "Booster box prices by country" },
  ];
}

export function PopularPages() {
  return (
    <section className="page mb-12" aria-labelledby="popular-h">
      <h2 id="popular-h" className="mb-4 sub-h2">
        Popular right now
      </h2>
      <ul className="flex flex-wrap gap-2">
        {popularLinks().map((l) => (
          <li key={l.href}>
            <Link href={l.href} prefetch={false} className="chip min-h-10">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
