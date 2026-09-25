import Link from "next/link";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header region={null} />
      <main id="main" className="page flex-1 py-24 text-center">
        <div className="font-display text-7xl font-extrabold text-brand">404</div>
        <h1 className="mt-4 font-display text-3xl font-bold">This page sold out.</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          We couldn&rsquo;t find it. DexCompare now covers Pokémon <b>sealed</b> product only — single-card pages from the old site are gone.
        </p>
        <Link href="/" className="btn-primary mt-8 px-6 py-3">
          Find sealed product →
        </Link>
      </main>
    </>
  );
}
