"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "./nav-sections";

// Persistent desktop rail (xl+): the whole site visible at first glance. Restyled
// with an active-page indicator and hover motion. Same shared NAV_SECTIONS as the
// phone sheet and the cinematic overlay. Hidden on the homepage so the grid-first
// marketplace gets the full width (nav there lives in the top bar + ⌘K launcher
// and the on-page "Shop by collection" tiles).
export function SideNav() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <aside className="hidden w-52 shrink-0 xl:block">
      <div className="sticky top-20 space-y-4 pb-8">
        <nav className="space-y-4">
          {NAV_SECTIONS.map((s) => (
            <div key={s.label}>
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</div>
              <ul className="space-y-0.5">
                {s.links.map((l) => {
                  const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        aria-current={active ? "page" : undefined}
                        className={`group relative flex items-center gap-2 rounded-lg py-1.5 pl-3 pr-2 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-400 ${
                          active
                            ? "bg-brand-500/15 text-white shadow-glow"
                            : "text-slate-300 hover:bg-ink-800 hover:text-white"
                        }`}
                      >
                        {/* Active accent bar */}
                        <span
                          className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-brand-400 to-gold transition-opacity ${
                            active ? "opacity-100" : "opacity-0"
                          }`}
                          aria-hidden
                        />
                        <span className="text-sm leading-none transition-transform group-hover:scale-110" aria-hidden>{l.icon}</span>
                        <span className="transition-transform group-hover:translate-x-0.5">{l.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
