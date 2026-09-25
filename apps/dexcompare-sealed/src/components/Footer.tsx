import Link from "next/link";
import { REGION_LIST } from "@/lib/regions";
import { CONTACT_EMAIL } from "@/lib/site";
import { LogoMark } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <div className="flex items-center gap-2 font-display text-lg font-extrabold">
            <LogoMark className="h-7 w-7" /> DexCompare
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            Pokémon TCG sealed product — booster boxes, Elite Trainer Boxes, bundles, collections and tins — compared across
            independent stores, with live stock and restock alerts.
          </p>
          <p className="mt-3 text-xs leading-5 text-faint">
            Prices are each store&rsquo;s own, in its own currency, and exclude shipping. eBay links are affiliate links: we may
            earn a commission at no cost to you. DexCompare is not affiliated with Nintendo, Creatures, GAME FREAK or The Pokémon
            Company.
          </p>
        </div>
        <div>
          <div className="eyebrow mb-3">Regions</div>
          <ul className="grid grid-cols-1 gap-1.5 text-sm">
            {REGION_LIST.map((r) => (
              <li key={r.region}>
                <Link href={`/${r.region}`} className="text-muted hover:text-ink">
                  <span aria-hidden="true">{r.flag}</span> {r.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-3">DexCompare</div>
          <ul className="grid gap-1.5 text-sm">
            <li><Link href="/about" className="text-muted hover:text-ink">How it works</Link></li>
            <li><Link href="/about#stores" className="text-muted hover:text-ink">For stores</Link></li>
            <li><Link href="/privacy" className="text-muted hover:text-ink">Privacy</Link></li>
            <li><a href={`mailto:${CONTACT_EMAIL}`} className="text-muted hover:text-ink">{CONTACT_EMAIL}</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
