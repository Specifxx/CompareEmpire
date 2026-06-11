import Link from "next/link";

// Numbered pagination preserving the current filters. Server component.
export function Pagination({
  page,
  totalPages,
  params,
}: {
  page: number;
  totalPages: number;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `/browse?${s}` : "/browse";
  };

  // Window of pages around the current one.
  const pages: number[] = [];
  const lo = Math.max(1, page - 2);
  const hi = Math.min(totalPages, page + 2);
  for (let p = lo; p <= hi; p++) pages.push(p);

  return (
    <nav className="mt-6 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 && (
        <Link href={href(page - 1)} className="btn-ghost px-3 py-1.5 text-sm">
          ← Prev
        </Link>
      )}
      {lo > 1 && (
        <>
          <Link href={href(1)} className="btn-ghost px-3 py-1.5 text-sm">1</Link>
          {lo > 2 && <span className="px-1 text-slate-600">…</span>}
        </>
      )}
      {pages.map((p) =>
        p === page ? (
          <span key={p} className="btn-primary px-3 py-1.5 text-sm">{p}</span>
        ) : (
          <Link key={p} href={href(p)} className="btn-ghost px-3 py-1.5 text-sm">{p}</Link>
        )
      )}
      {hi < totalPages && (
        <>
          {hi < totalPages - 1 && <span className="px-1 text-slate-600">…</span>}
          <Link href={href(totalPages)} className="btn-ghost px-3 py-1.5 text-sm">{totalPages}</Link>
        </>
      )}
      {page < totalPages && (
        <Link href={href(page + 1)} className="btn-ghost px-3 py-1.5 text-sm">
          Next →
        </Link>
      )}
    </nav>
  );
}
