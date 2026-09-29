import Link from "next/link";
import { Header } from "@/components/Header";
import { REGION_LIST, X_DEFAULT_REGION } from "@/lib/regions";

export default function NotFound() {
  return (
    <>
      <Header region={null} />
      <main id="main" className="page flex-1 py-20 text-center">
        <div className="font-display text-7xl font-extrabold text-brand">404</div>
        <h1 className="mt-4 font-display text-3xl font-bold">This page sold out.</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          We couldn&rsquo;t find it. DexCompare covers Pokémon <b>sealed</b> product only — single-card pages from the old site are gone.
        </p>
        {/* A plain form (no JS needed on an error page): the region's browse page filters by ?q=. */}
        <form action={`/${X_DEFAULT_REGION}/sealed`} method="get" role="search" className="mx-auto mt-8 flex max-w-md items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-4 shadow-card">
          <input name="q" type="search" placeholder="Search sealed — “Prismatic Evolutions ETB”" aria-label="Search sealed products" className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-faint" />
          <button type="submit" className="btn-primary px-4 py-2">
            Search
          </button>
        </form>
        <p className="mt-2 text-xs text-faint">Searches the US site; switch region from any page&rsquo;s header.</p>
        <div className="eyebrow mt-10">Or pick your region</div>
        <ul className="mx-auto mt-3 flex max-w-2xl flex-wrap justify-center gap-2">
          {REGION_LIST.map((r) => (
            <li key={r.region}>
              <Link href={`/${r.region}`} className="chip">
                <span aria-hidden="true">{r.flag}</span> {r.name}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
