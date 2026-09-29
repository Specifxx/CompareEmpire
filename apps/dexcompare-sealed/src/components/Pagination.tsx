import Link from "next/link";

/**
 * Server-rendered page links, so every row of a long list is reachable from
 * HTML (crawlers don't press "Show more"). Page 1 is the bare URL; page N is
 * `${base}/page/N`, each its own cached render. Nothing is prefetched: a
 * listing page's RSC payload is big and most links are never followed.
 */
export function pageHref(base: string, page: number): string {
  return page <= 1 ? base : `${base}/page/${page}`;
}

export function Pagination({ base, page, pages }: { base: string; page: number; pages: number }) {
  if (pages <= 1) return null;
  // The first, the last, and a window around the current page.
  const want = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter((n) => n >= 1 && n <= pages));
  const items: (number | "…")[] = [];
  let prev = 0;
  for (const n of [...want].sort((a, b) => a - b)) {
    if (n - prev > 1) items.push("…");
    items.push(n);
    prev = n;
  }
  const cell = "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium";
  return (
    <nav aria-label="Pages" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={pageHref(base, page - 1)} prefetch={false} rel="prev" className={`${cell} btn-ghost`}>
          ← Previous
        </Link>
      ) : (
        <span className={`${cell} text-faint`} aria-disabled="true">
          ← Previous
        </span>
      )}
      {items.map((it, i) =>
        it === "…" ? (
          <span key={`gap-${i}`} className={`${cell} text-faint`} aria-hidden="true">
            …
          </span>
        ) : it === page ? (
          <span key={it} className={`${cell} bg-ink text-surface`} aria-current="page">
            {it}
          </span>
        ) : (
          <Link key={it} href={pageHref(base, it)} prefetch={false} className={`${cell} border border-line bg-surface hover:bg-raised`}>
            {it}
          </Link>
        ),
      )}
      {page < pages ? (
        <Link href={pageHref(base, page + 1)} prefetch={false} rel="next" className={`${cell} btn-ghost`}>
          Next →
        </Link>
      ) : (
        <span className={`${cell} text-faint`} aria-disabled="true">
          Next →
        </span>
      )}
    </nav>
  );
}
