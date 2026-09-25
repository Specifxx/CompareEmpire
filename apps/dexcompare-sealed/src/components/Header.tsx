import Link from "next/link";
import { REGIONS, type Region } from "@/lib/regions";
import { Logo } from "./Logo";
import { RegionSwitcher } from "./RegionSwitcher";
import { SearchBox } from "./SearchBox";

export function Header({ region }: { region: Region | null }) {
  const home = region ? `/${region}` : "/";
  const nav = region
    ? [
        { href: `/${region}/sealed`, label: "All sealed" },
        { href: `/${region}/type/booster-boxes`, label: "Booster boxes" },
        { href: `/${region}/type/elite-trainer-boxes`, label: "ETBs" },
        { href: `/${region}/sets`, label: "Sets" },
        { href: `/${region}/stores`, label: "Stores" },
      ]
    : [];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="page flex h-16 items-center gap-4">
        <Link href={home} className="shrink-0" aria-label={`DexCompare${region ? ` ${REGIONS[region].name}` : ""} home`}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:bg-raised hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {region && (
            <div className="hidden w-64 md:block">
              <SearchBox region={region} />
            </div>
          )}
          <RegionSwitcher region={region} />
        </div>
      </div>
      {region && (
        <nav className="page flex gap-1 overflow-x-auto pb-2 lg:hidden" aria-label="Sections">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="shrink-0 rounded-full border border-line px-3 py-1 text-sm text-muted">
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
