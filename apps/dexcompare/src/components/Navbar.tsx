import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "./SearchBar";
import { NavWishlistButton } from "./NavWishlistButton";
import { MobileNav } from "./MobileNav";
import { NavLauncherButton } from "./NavLauncherButton";
import { CountrySwitcher } from "./CountrySwitcher";
import { Logo } from "./Logo";
import { NavUser } from "./NavUser";

// Deliberately minimal: the database (browse/search) is the whole product. The only
// other controls are the market/country switcher, the (cookie-based) wishlist and
// the account menu.
//
// NO server-side session read here: the navbar renders on every route, so a
// cookies() read would force the whole site dynamic (killing ISR). NavUser
// fetches the session client-side via /api/me instead.
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

        {/* Nav: the three commerce tabs stay inline; EVERYTHING else lives in the
            grouped Menu (same sections as the phone sheet — one mental model). */}
        <nav className="ml-auto flex items-center gap-0.5 sm:gap-1 lg:ml-0">
          <Link href="/browse" className="rounded-lg px-2 py-2 text-sm font-medium text-slate-200 outline-none transition-colors hover:bg-ink-800 hover:text-brand-300 focus-visible:ring-2 focus-visible:ring-brand-400 sm:px-2.5">
            Database
          </Link>
          <Link href="/sealed" className="hidden rounded-lg px-2.5 py-2 text-sm font-medium text-slate-200 outline-none transition-colors hover:bg-ink-800 hover:text-brand-300 focus-visible:ring-2 focus-visible:ring-brand-400 sm:block">
            Sealed
          </Link>
          <Link href="/deals" className="hidden rounded-lg px-2.5 py-2 text-sm font-medium text-gold outline-none transition-colors hover:bg-ink-800 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-400 md:block">
            Deals
          </Link>
          <NavLauncherButton compact className="ml-1 hidden lg:inline-flex" />
          <CountrySwitcher className="ml-1" />
          <NavWishlistButton />
          <NavUser />
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
