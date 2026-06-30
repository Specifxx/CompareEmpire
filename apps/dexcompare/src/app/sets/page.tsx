import Link from "next/link";
import type { Metadata } from "next";
import { POKEMON_SETS } from "@/lib/pokemon-sets";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "All Pokémon TCG Sets — Browse by Era",
  description: "Browse every Pokémon TCG set by era — from Mega Evolution and Scarlet & Violet back to the original Base Set. Compare card prices set by set.",
  alternates: { canonical: "/sets" },
};

// Group POKEMON_SETS (newest first) into ordered series buckets.
// First occurrence of a series in the array defines its sort position, so
// the newest series (Mega Evolution) naturally comes first.
function groupBySeries(sets: typeof POKEMON_SETS) {
  const order: string[] = [];
  const map: Record<string, typeof POKEMON_SETS> = {};
  for (const s of sets) {
    if (!map[s.series]) {
      map[s.series] = [];
      order.push(s.series);
    }
    map[s.series].push(s);
  }
  return order.map((series) => ({ series, sets: map[series] }));
}

export default function SetsIndex() {
  const total = POKEMON_SETS.length;
  const grouped = groupBySeries(POKEMON_SETS);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "All Pokémon TCG Sets",
      url: `${SITE_URL}/sets`,
      description: "Every Pokémon TCG set, grouped by era — compare card prices set by set.",
      isPartOf: { "@type": "WebSite", name: "DexCompare", url: SITE_URL },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: POKEMON_SETS.map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/sets/${s.slug}`,
          name: `Pokémon ${s.name}`,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Sets", item: `${SITE_URL}/sets` },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mb-2">
        <h1 className="text-2xl font-extrabold text-white">All Pokémon TCG sets</h1>
        <p className="mt-1 text-sm text-slate-400">
          {total} sets across {grouped.length} eras — newest first. Pick a set to compare its card prices.
        </p>
      </div>

      {/* Era quick-jump nav */}
      <nav aria-label="Jump to era" className="mb-8 flex flex-wrap gap-2">
        {grouped.map(({ series }) => (
          <a
            key={series}
            href={`#${slugify(series)}`}
            className="rounded-full border border-ink-700 bg-ink-900 px-3 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-brand-500 hover:text-white"
          >
            {series}
          </a>
        ))}
      </nav>

      {/* Sets grouped by era */}
      <div className="space-y-10">
        {grouped.map(({ series, sets: seriesSets }) => (
          <section key={series} id={slugify(series)} aria-labelledby={`hd-${slugify(series)}`}>
            {/* Series header */}
            <div className="mb-4 flex items-baseline gap-3 border-b border-ink-700 pb-2">
              <h2
                id={`hd-${slugify(series)}`}
                className="text-base font-bold text-white"
              >
                {series}
              </h2>
              <span className="text-xs text-slate-500">
                {seriesSets.length} {seriesSets.length === 1 ? "set" : "sets"}
              </span>
              <span className="ml-auto text-xs text-slate-600">
                {seriesSets[seriesSets.length - 1].releaseDate.slice(0, 4)}
                {seriesSets[0].releaseDate.slice(0, 4) !== seriesSets[seriesSets.length - 1].releaseDate.slice(0, 4)
                  ? `–${seriesSets[0].releaseDate.slice(0, 4)}`
                  : ""}
              </span>
            </div>

            {/* Set tiles */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {seriesSets.map((s) => (
                <Link
                  key={s.code}
                  href={`/sets/${s.slug}`}
                  className="card-surface group flex flex-col items-center gap-3 p-4 transition-colors hover:border-brand-500"
                >
                  <div className="flex h-14 w-full items-center justify-center">
                    {s.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.logo}
                        alt={s.name}
                        loading="lazy"
                        className="max-h-14 max-w-full object-contain transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-sm font-bold text-white">{s.code.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="w-full text-center">
                    <div className="truncate text-xs font-semibold text-white">{s.name}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {s.total} cards · {s.releaseDate.slice(0, 4)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
