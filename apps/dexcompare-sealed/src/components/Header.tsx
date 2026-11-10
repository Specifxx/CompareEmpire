import Link from "next/link";
import { inSeason, saleStrip } from "@/lib/black-friday";
import { navGroups } from "@/lib/nav";
import { REGIONS, X_DEFAULT_REGION, type Region } from "@/lib/regions";
import { sectionHref, SECTION_PATHS, type SectionKey } from "@/lib/site";
import { EbayNavLink } from "./Ebay";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NavLink } from "./NavLink";
import { RegionSwitcher } from "./RegionSwitcher";
import { SearchBox } from "./SearchBox";
import { HeaderNavItems, SoftHeaderNavItems, SoftRegionSwitcher, SoftSearchBox, type HeaderNavItem } from "./HeaderNav";
import { dealsMenuColumns, guidesMenuColumns, pokemonMenuColumns, setsMenuColumns, shopMenuColumns } from "./ShopMenu";
import { ThemeToggle } from "./ThemeToggle";
import { CartHeaderLink } from "./cart/CartHeaderLink";

/**
 * The desktop nav (lg and up), in order. `also`: other paths (under the region) that count as the section, for its current
 * state: a type page is part of "All sealed", the per-pack ranking and the weekly digest sit with "Deals".
 */
export const HEADER_NAV: { key: SectionKey; label: string; also?: string[]; xl?: boolean }[] = [
  { key: "deals", label: "Deals", also: [SECTION_PATHS.perPack, SECTION_PATHS.thisWeek, SECTION_PATHS.backInStock, SECTION_PATHS.priceMoves, SECTION_PATHS.outOfPrint] },
  { key: "sealed", label: "All sealed", also: ["/type"] },
  { key: "sets", label: "Sets" },
  { key: "pokemon", label: "Pokémon", also: ["/pokemon", "/japanese"] },
  { key: "guides", label: "Guides", also: [SECTION_PATHS.tools, SECTION_PATHS.releases] },
  { key: "stores", label: "Stores" },
];

/** The nav as rendered: HEADER_NAV, with "Black Friday" after Deals while the season is on (lib/black-friday.ts inSeason). */
export function headerNav(today = new Date().toISOString().slice(0, 10)): typeof HEADER_NAV {
  if (!inSeason(today)) return HEADER_NAV;
  // xl only: at lg (1024) the row has no room for a seventh item; the phone menu, the footer and the region home link it there.
  // From the Sunday after Black Friday to the day after Cyber Monday the entry is Cyber Monday's (saleStrip).
  const cm = saleStrip(today)?.key === "cyberMonday";
  return [HEADER_NAV[0], cm ? { key: "cyberMonday", label: "Cyber Monday", xl: true } : { key: "blackFriday", label: "Black Friday", xl: true }, ...HEADER_NAV.slice(1)];
}

/**
 * The desktop nav's items for a region, links and all: Deals, All sealed, Sets, Pokémon and Guides each open a mega menu
 * (components/NavMenu.tsx; the columns are in components/ShopMenu.tsx). The pre-order hub that "Releases" used to become while a set
 * is on pre-order leads the Deals menu's "Coming soon" column, with the release calendar (owner, 2026-11-09).
 */
export function headerNavItems(region: Region, today = new Date().toISOString().slice(0, 10), listed?: ReadonlySet<string> | null): HeaderNavItem[] {
  return headerNav(today).map((n) => ({
    href: sectionHref(region, n.key),
    label: n.label,
    also: n.also?.map((p) => `/${region}${p}`),
    xl: n.xl,
    menu:
      n.key === "sealed" ? shopMenuColumns(region, today, listed)
      : n.key === "sets" ? setsMenuColumns(region, today, listed)
      : n.key === "deals" ? dealsMenuColumns(region, today)
      : n.key === "pokemon" ? pokemonMenuColumns(region)
      : n.key === "guides" ? guidesMenuColumns(region)
      : undefined,
    menuKind: n.key === "sets" ? "sets" : n.key === "sealed" ? "shop" : n.key === "deals" ? "deals" : n.key === "pokemon" ? "pokemon" : n.key === "guides" ? "guides" : undefined,
  }));
}

/**
 * The site header: ONE row, var(--hdr) tall (60px; 64px from lg), sticky. Everything a page needs to go somewhere else is in it at
 * every width, so nothing below it has to repeat it. From xl it spans the shell (the sidebar's column and the page's).
 *
 * - Below lg: the logo mark (the word from sm), the search box filling the row, the flag-only region button and the menu button
 *   (components/MobileMenu.tsx: every product type, set and section, then the regions).
 * - lg and up: logo, the sections (NavLink marks the current one), eBay's labelled search link (xl, region pages), search, region.
 * - No region (the landing page, About, the legal pages, a 404): the same header, for the visitor's region (owner, 2026-10-28: the
 *   whole navigation from the first page, no "Continue to <region>" step). The server's HTML has the default region's links; the
 *   browser moves them to the suggested one (HeaderNav.tsx), and a region picked there switches the page in place.
 *
 * The search box is components/SearchBox.tsx with its own props; `.hdr-search` (globals.css) only sizes it to the row.
 */
export function Header({ region, listed }: { region: Region | null; listed?: ReadonlySet<string> | null }) {
  const home = region ? `/${region}` : "/";
  const built = region ?? X_DEFAULT_REGION;
  const items = headerNavItems(built, undefined, listed);
  const groups = navGroups(built, undefined, listed);
  return (
    <header className="sticky top-0 z-40 h-[var(--hdr)] border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="page flex h-full items-center gap-2 sm:gap-3 lg:gap-4 xl:max-w-shell">
        <Link href={home} className="flex h-11 shrink-0 items-center rounded-lg" aria-label={`DexCompare${region ? ` ${REGIONS[region].name}` : ""} home`}>
          <Logo wordmark="hidden sm:inline" />
        </Link>
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {region ? <HeaderNavItems items={items} /> : <SoftHeaderNavItems items={items} />}
          {/* A discreet, labelled sponsored item (xl and up only): eBay's search, tagged. Not a section of the site. */}
          {region && <EbayNavLink region={region} />}
        </nav>
        <div className="hdr-search min-w-0 flex-1 lg:ml-auto lg:min-w-[7rem] lg:max-w-48">{region ? <SearchBox region={region} size="sm" /> : <SoftSearchBox />}</div>
        {/* Premium (owner, 2026-11-10: "a nice Premium button on the homepage people can see"): every width, a star alone on a phone. */}
        <Link
          href="/premium"
          prefetch={false}
          aria-label="DexCompare Premium"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105 sm:px-3.5"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 fill-current"><path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" /></svg>
          <span className="hidden sm:inline">Premium</span>
        </Link>
        <ThemeToggle className="hidden sm:flex" />
        {region ? <RegionSwitcher region={region} compact /> : <SoftRegionSwitcher />}
        {/* The cart list (components/cart, owner 2026-11-06): every width, with its count. */}
        <CartHeaderLink />
        <MobileMenu region={region} groups={groups} built={built} className="lg:hidden" />
      </div>
    </header>
  );
}
