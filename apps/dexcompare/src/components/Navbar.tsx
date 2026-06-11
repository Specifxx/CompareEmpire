import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "./SearchBar";
import { NavWishlistButton } from "./NavWishlistButton";
import { MobileNav } from "./MobileNav";
import { NavDropdown } from "./NavDropdown";
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

        {/* Nav: Database always visible; Sealed from sm; Deals/Games/Trade from md
            (everything lives in the burger below those breakpoints — the full row
            overflowed 360–400px screens). */}
        <nav className="ml-auto flex items-center gap-0.5 sm:gap-1 lg:ml-0">
          <Link href="/browse" className="rounded-lg px-2 py-2 text-sm font-medium text-slate-200 hover:bg-ink-800 hover:text-white sm:px-2.5">
            Database
          </Link>
          <Link href="/sealed" className="hidden rounded-lg px-2.5 py-2 text-sm font-medium text-slate-200 hover:bg-ink-800 hover:text-white sm:block">
            Sealed
          </Link>
          <Link href="/deals" className="hidden rounded-lg px-2.5 py-2 text-sm font-medium text-gold hover:bg-ink-800 md:block">
            Deals
          </Link>
          <Link href="/trade" className="hidden rounded-lg px-2.5 py-2 text-sm font-medium text-slate-200 hover:bg-ink-800 hover:text-white md:block">
            Trade
          </Link>
          <Link href="/games" className="hidden rounded-lg px-2.5 py-2 text-sm font-medium text-slate-200 hover:bg-ink-800 hover:text-white md:block">
            🕹️ Games
          </Link>
          <div className="hidden lg:block">
            <NavDropdown
              label="More"
              items={[
                { href: "/market", label: "DexCompare Index", desc: "How the whole Pokémon market is moving" },
                { href: "/card-value", label: "Card value checker", desc: "What are your cards worth? Free, updated daily" },
                { href: "/restock", label: "Drops & restocks", desc: "New releases, preorders & restock alerts" },
                { href: "/guides", label: "Buying guides", desc: "Where to buy, grading, fakes & storage" },
                { href: "/blog", label: "Blog", desc: "Deals, prices & buying smart" },
                { href: "/collection", label: "My collection", desc: "Track the cards you own" },
                { href: "/contact", label: "Contact", desc: "Report a price, suggest a store" },
              ]}
            />
          </div>
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
