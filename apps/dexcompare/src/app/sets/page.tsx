import Link from "next/link";
import type { Metadata } from "next";
import { SETS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "All Pokémon TCG Sets",
  description: "Browse every Pokémon TCG set and compare card prices set by set.",
};

const PER_PAGE = 24;

export default function SetsIndex({ searchParams }: { searchParams: { page?: string } }) {
  const total = SETS.length;
  const pages = Math.ceil(total / PER_PAGE);
  const page = Math.min(Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1), pages);
  const start = (page - 1) * PER_PAGE;
  const slice = SETS.slice(start, start + PER_PAGE);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-1 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-white">All Pokémon TCG sets</h1>
        <span className="text-sm text-slate-400">{total} sets · page {page} of {pages}</span>
      </div>
      <p className="mb-6 text-sm text-slate-400">Newest first. Pick a set to compare its card prices.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {slice.map((s) => (
          <Link
            key={s.code}
            href={`/sets/${s.slug}`}
            className="card-surface flex flex-col gap-1 p-4 transition-colors hover:border-brand-500"
          >
            <span className="text-lg font-bold text-white">{s.code.toUpperCase()}</span>
            <span className="truncate text-xs text-slate-400">{s.name}</span>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
        {page > 1 && (
          <Link href={`/sets?page=${page - 1}`} className="btn-ghost">← Prev</Link>
        )}
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
        {page < pages && (
          <Link href={`/sets?page=${page + 1}`} className="btn-ghost">Next →</Link>
        )}
      </nav>
    </main>
  );
}
