import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found — DexCompare",
  description: "The page you're looking for doesn't exist. Search the Pokémon card database or browse all cards.",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      {/* Large muted 404 behind the heading */}
      <div
        className="pointer-events-none select-none text-[7rem] font-extrabold leading-none text-ink-700"
        aria-hidden
      >
        404
      </div>

      <div className="-mt-4 flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold text-white">Page not found</h1>
        <p className="text-sm leading-relaxed text-slate-400">
          That URL doesn&apos;t exist on DexCompare. Try searching for the card
          you&apos;re after, or browse the full database.
        </p>
      </div>

      {/* Quick search — submits to /browse?q= (plain form, no JS required) */}
      <form action="/browse" method="get" className="flex w-full max-w-sm gap-2">
        <label htmlFor="nf-search" className="sr-only">
          Search Pokémon cards
        </label>
        <input
          id="nf-search"
          name="q"
          type="search"
          placeholder="Search cards…"
          autoComplete="off"
          className="input flex-1"
        />
        <button type="submit" className="btn-primary shrink-0">
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-ghost">
          Go home
        </Link>
        <Link href="/browse" className="btn-ghost">
          Browse all cards
        </Link>
        <Link href="/sets" className="btn-ghost">
          Browse sets
        </Link>
      </div>
    </div>
  );
}
