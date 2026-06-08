import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "./SearchBar";
import { NavWishlistButton } from "./NavWishlistButton";
import { MobileNav } from "./MobileNav";
import { CountrySwitcher } from "./CountrySwitcher";
import { Logo } from "./Logo";

// Deliberately minimal: the database (browse/search) is the whole product. The only
// other controls are the market/country switcher and the (cookie-based) wishlist.
export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/95">
      <div className="container-app">
       <div className="flex h-16 items-center gap-4">
        {/* Logo: mark + text wordmark */}
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="DexCompare home">
          <Logo size={36} />
          <span className="hidden text-lg font-extrabold tracking-tight text-white sm:block">
            Dex<span className="text-brand-400">Compare</span>
          </span>
        </Link>

        {/* Search — inline on desktop; on smaller screens it gets its own full-width row below */}
        <div className="hidden flex-1 lg:block">
          <Suspense fallback={<div className="input max-w-xl" />}>
            <SearchBar />
          </Suspense>
        </div>

        {/* Nav: Database + country switcher + wishlist */}
        <nav className="ml-auto flex items-center gap-1 lg:ml-0">
          <Link href="/browse" className="rounded-lg px-2.5 py-2 text-sm font-medium text-slate-200 hover:bg-ink-800 hover:text-white">
            Database
          </Link>
          <CountrySwitcher className="ml-1" />
          <NavWishlistButton />
          <MobileNav />
        </nav>
       </div>

        {/* Search gets its own full-width row below the lg breakpoint (so it's
            never cramped on phones/tablets). */}
        <div className="pb-3 lg:hidden">
          <Suspense fallback={<div className="input" />}>
            <SearchBar />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
