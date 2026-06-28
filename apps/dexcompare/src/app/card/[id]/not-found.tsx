import Link from "next/link";

export default function CardNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <div
        className="pointer-events-none select-none text-[7rem] font-extrabold leading-none text-ink-700"
        aria-hidden
      >
        404
      </div>

      <div className="-mt-4 flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold text-white">Card not found</h1>
        <p className="text-sm leading-relaxed text-slate-400">
          That card isn&apos;t in our database yet. Search by name or collector number (printed
          bottom-left of the card, e.g. &ldquo;Charizard 4/102&rdquo;) to find what you&apos;re
          after.
        </p>
      </div>

      {/* Plain-HTML search — works without JS */}
      <form action="/browse" method="get" className="flex w-full max-w-sm gap-2">
        <label htmlFor="cnf-search" className="sr-only">
          Search Pokémon cards
        </label>
        <input
          id="cnf-search"
          name="q"
          type="search"
          placeholder="e.g. Charizard 4/102"
          autoComplete="off"
          className="input flex-1"
        />
        <button type="submit" className="btn-primary shrink-0">
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/browse" className="btn-ghost">
          Browse all cards
        </Link>
        <Link href="/sets" className="btn-ghost">
          Browse sets
        </Link>
        <Link href="/" className="btn-ghost">
          Go home
        </Link>
      </div>
    </div>
  );
}
