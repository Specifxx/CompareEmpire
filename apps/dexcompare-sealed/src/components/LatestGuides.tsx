import Link from "next/link";
import { latestGuides } from "@/content/guides";
import type { Region } from "@/lib/regions";

// The newest guides as plain server-rendered links (no images, no script): on the region homes and the landing page, so every new
// post is one link from a home page for crawlers and phone visitors alike (2026-11-03, the set guides).
export function LatestGuides({ region, n = 6 }: { region: Region; n?: number }) {
  const list = latestGuides(region, n);
  return (
    <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-latest-guides="">
      {list.map((g) => (
        <li key={g.slug}>
          <Link href={`/${region}/guides/${g.slug}`} prefetch={false} className="card group flex h-full flex-col p-4 transition-shadow hover:shadow-lift">
            <span className="eyebrow">{g.kicker}</span>
            <span className="mt-1.5 font-display text-base font-bold leading-snug tracking-tight group-hover:text-brand">{g.title}</span>
            <span className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">{g.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
