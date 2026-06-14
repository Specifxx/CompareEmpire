import Link from "next/link";
import type { Metadata } from "next";
import { POKEMON_SETS } from "@/lib/pokemon-sets";

export const metadata: Metadata = {
  title: "All Yu-Gi-Oh! Sets",
  description: "Browse every Yu-Gi-Oh! set and compare card prices set by set.",
  alternates: { canonical: "/sets" },
};

const PER_PAGE = 24;

export default function SetsIndex({ searchParams }: { searchParams: { page?: string } }) {
  const total = POKEMON_SETS.length;
  const pages = Math.ceil(total / PER_PAGE);
  const page = Math.min(Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1), pages);
  const start = (page - 1) * PER_PAGE;
  const slice = POKEMON_SETS.slice(start, start + PER_PAGE);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-1 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-white">All Yu-Gi-Oh! sets</h1>
        <span className="text-sm text-slate-400">{total} sets · page {page} of {pages}</span>
      </div>
      <p className="mb-6 text-sm text-slate-400">Newest first. Pick a set to compare its card prices.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {slice.map((s) => (
          <Link
            key={s.code}
            href={`/sets/${s.slug}`}
            className="card-surface group flex flex-col items-center justify-between gap-3 p-4 transition-colors hover:border-brand-500"
          >
            <div className="flex h-16 w-full items-center justify-center">
              {s.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logo} alt={s.name} loading="lazy" className="max-h-16 max-w-full object-contain transition-transform group-hover:scale-105" />
              ) : (
                <span className="text-lg font-bold text-white">{s.code.toUpperCase()}</span>
              )}
            </div>
            <div className="text-center">
              <div className="truncate text-sm font-semibold text-white">{s.name}</div>
              <div className="text-[11px] text-slate-500">{s.series} · {s.releaseDate.slice(0, 4)}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      <nav className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm">
        {page > 1 && <Link href={`/sets?page=${page - 1}`} className="btn-ghost">← Prev</Link>}
        {Array.from({ length: pages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 2)
          .map((p, idx, arr) => (
            <span key={p} className="flex items-center gap-2">
              {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-slate-600">…</span>}
              <Link
                href={`/sets?page=${p}`}
                className={`rounded-lg px-3 py-1.5 ${p === page ? "bg-brand text-white" : "text-slate-300 hover:bg-ink-800"}`}
              >
                {p}
              </Link>
            </span>
          ))}
        {page < pages && <Link href={`/sets?page=${page + 1}`} className="btn-ghost">Next →</Link>}
      </nav>
    </main>
  );
}
