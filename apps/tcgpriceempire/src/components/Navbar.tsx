import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "./SearchBar";
import { GameSwitcher } from "./GameSwitcher";
import { MobileNav } from "./MobileNav";
import { Logo } from "./Logo";

// Minimal: search is the product. Browse + Sealed up front, the game hubs in the
// mobile menu, and the "which games I play" switcher always visible.
export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/95">
      <div className="container-app">
        <div className="flex h-16 items-center gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="TCGPriceEmpire home">
            <Logo size={36} />
            <span className="hidden text-lg font-extrabold tracking-tight text-white sm:block">
              TCG<span className="text-brand-400">Price</span>
              <span className="text-gold">Empire</span>
            </span>
          </Link>

          <div className="hidden flex-1 lg:block">
            <Suspense fallback={<div className="input max-w-xl" />}>
              <SearchBar />
            </Suspense>
          </div>

          <nav className="ml-auto flex items-center gap-1 lg:ml-0">
            <Link href="/browse" className="rounded-lg px-2.5 py-2 text-sm font-medium text-slate-200 hover:bg-ink-800 hover:text-white">
              Browse
            </Link>
            <Link href="/sealed" className="hidden rounded-lg px-2.5 py-2 text-sm font-medium text-slate-200 hover:bg-ink-800 hover:text-white sm:block">
              Sealed
            </Link>
            <GameSwitcher className="ml-1" />
            <MobileNav />
          </nav>
        </div>

        {/* Search gets its own full-width row below the lg breakpoint. */}
        <div className="pb-3 lg:hidden">
          <Suspense fallback={<div className="input" />}>
            <SearchBar />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
