import Link from "next/link";

export default function SetNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <div
        className="pointer-events-none select-none text-[7rem] font-extrabold leading-none text-ink-700"
        aria-hidden
      >
        404
      </div>

      <div className="-mt-4 flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold text-white">Set not found</h1>
        <p className="text-sm leading-relaxed text-slate-400">
          That Pokémon set isn&apos;t in our database. Browse the full sets list to find the era
          you&apos;re after, or search for individual cards directly.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/sets" className="btn-primary">
          Browse all sets
        </Link>
        <Link href="/browse" className="btn-ghost">
          Search all cards
        </Link>
        <Link href="/" className="btn-ghost">
          Go home
        </Link>
      </div>
    </div>
  );
}
