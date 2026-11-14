import Link from "next/link";
import { latestGuides } from "@/content/guides";
import type { Region } from "@/lib/regions";

// The newest guides as server-rendered links with each guide's own share card as its thumbnail (2026-11-09; no script): on the region homes and the landing page, so every new
// post is one link from a home page for crawlers and phone visitors alike (2026-11-03, the set guides).
export function LatestGuides({ region, n = 6 }: { region: Region; n?: number }) {
  const list = latestGuides(region, n);
  return (
    <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-latest-guides="">
      {list.map((g) => (
        <li key={g.slug}>
          <Link href={`/${region}/guides/${g.slug}`} prefetch={false} className="tile group flex h-full flex-col overflow-hidden">
            <img
              src={`/og/guides/${g.slug}`}
              alt={`${g.title}: guide cover`}
              width={1200}
              height={630}
              loading="lazy"
              decoding="async"
              className="aspect-[1200/630] w-full border-b border-line bg-raised object-cover"
            />
            <span className="flex flex-1 flex-col p-4">
              <span className="eyebrow">{g.kicker}</span>
              <span className="mt-1.5 font-display text-base font-bold leading-snug tracking-tight group-hover:text-brand">{g.title}</span>
              <span className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">{g.description}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
