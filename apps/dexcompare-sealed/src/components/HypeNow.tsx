import Link from "next/link";
import { GUIDE_BY_SLUG, guideFor, type GuideSlug } from "@/content/guides";
import type { Region } from "@/lib/regions";
import { isPreorderSet } from "@/lib/release";
import { SET_BY_CODE } from "@/lib/sets";
import { formatRelease } from "@/lib/release";

// "What's hyped right now" on the region homes (owner, 2026-11-10): plain server-rendered links, no script, to the pages that
// already answer the hype questions (price, chase cards, pre-order, what to expect). Dates come from sets.ts, never typed here,
// so the line moves on by itself on release day. Nothing here makes a claim: it names a set, its date and where to read more.
const ROWS: readonly { set: string; guides: readonly { slug: GuideSlug; label: string }[] }[] = [
  {
    set: "me6",
    guides: [
      { slug: "delta-reign-booster-box-price", label: "Booster box price, store by store" },
      { slug: "delta-reign-chase-cards", label: "Chase cards" },
      { slug: "delta-reign-booster-box-vs-etb", label: "Booster box or ETB?" },
    ],
  },
  { set: "me7", guides: [{ slug: "flowing-fists-mega-lucario-z", label: "What we know so far" }] },
  { set: "cel30", guides: [{ slug: "30th-celebration-chase-cards", label: "Chase cards" }] },
];

export function HypeNow({ region }: { region: Region }) {
  const rows = ROWS.map((row) => {
    const set = SET_BY_CODE.get(row.set);
    if (!set) return null;
    const guides = row.guides.filter((g) => GUIDE_BY_SLUG.has(g.slug) && guideFor(g.slug, region));
    return { set, guides, upcoming: isPreorderSet(set.code) };
  }).filter((x): x is NonNullable<typeof x> => !!x && x.guides.length > 0);
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="hype-now" className="mt-8" data-hype-now="">
      <h2 id="hype-now" className="font-display text-xl font-bold tracking-tight">
        Pokémon hype right now
      </h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {rows.map(({ set, guides, upcoming }) => (
          <div key={set.code} className="card p-4">
            <div className="eyebrow">{upcoming ? `Upcoming · ${formatRelease(set.releaseDate)}` : `Out ${formatRelease(set.releaseDate)}`}</div>
            <Link href={`/${region}/sets/${set.slug}`} prefetch={false} className="mt-1 block font-display text-lg font-bold hover:text-brand">
              {set.name}
            </Link>
            <ul role="list" className="mt-2 grid gap-1 text-sm">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link href={`/${region}/guides/${g.slug}`} prefetch={false} className="text-muted underline-offset-2 hover:text-ink hover:underline">
                    {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
