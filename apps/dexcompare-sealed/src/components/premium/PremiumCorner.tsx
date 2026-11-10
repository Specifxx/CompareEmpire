"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { readStored, PREMIUM_PRICE_LINE } from "@/lib/premium-member";

// The Premium corner card (owner, 2026-11-10: "the slider that RiftCompare used to use, pointing to Premium"). One small card in the foot of
// the page, never a modal, with the rules that keep it from being a pop-up for a new visitor:
//   • Browser only, nothing in the server HTML.
//   • Never on a visit's first two pages: it arms on the third distinct page (sessionStorage), and once armed shows only after the visitor has
//     scrolled, so a searcher's landing screen is never covered.
//   • Never for a member (a stored Premium sign-in), on the Premium, watches or sign-in-return pages, on a product page (the buy bar is there)
//     or while the rating card, a dialog or another ad unit is on screen: a visit holds one unit at a time. It carries [data-ad], so the phone
//     dock yields to it.
//   • ✕ silences it for 14 days; opening Premium silences it for 30. It shows at most once a visit.
// Copy names what Premium does and what it costs, nothing else (PREMIUM_PRICE_LINE).

const SEEN_KEY = "dex_pc_pages";
const SHOWN_KEY = "dex_pc_shown";
const SILENT_KEY = "dex_pc_silent_until";
const ARM_PAGES = 3;
const SCROLL_ARM = 0.5;
const DAY = 86_400_000;
const OFF_PATHS = [/^\/premium/, /^\/watches/, /\/p\//];

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function PremiumCorner() {
  const path = usePathname() || "/";
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState(false);

  // Count each distinct page once per visit.
  useEffect(() => {
    if (OFF_PATHS.some((re) => re.test(path))) {
      setOpen(false);
      return;
    }
    const seen: string[] = safe(() => JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]"), []);
    if (!seen.includes(path)) {
      seen.push(path);
      safe(() => sessionStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-20))), undefined);
    }
    setArmed(seen.length >= ARM_PAGES);
  }, [path]);

  useEffect(() => {
    if (!armed || OFF_PATHS.some((re) => re.test(path))) return;
    if (safe(() => sessionStorage.getItem(SHOWN_KEY), null)) return;
    if (Number(safe(() => localStorage.getItem(SILENT_KEY), "0")) > Date.now()) return;
    if (readStored()) return;
    const check = () => {
      const scrolled = window.scrollY / Math.max(1, window.innerHeight) >= SCROLL_ARM;
      const busy = document.querySelector("[data-rate-card], dialog[open], [aria-modal='true']");
      if (scrolled && !busy) {
        safe(() => sessionStorage.setItem(SHOWN_KEY, "1"), undefined);
        setOpen(true);
        window.removeEventListener("scroll", check);
      }
    };
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [armed, path]);

  if (!open) return null;
  const silence = (days: number) => {
    safe(() => localStorage.setItem(SILENT_KEY, String(Date.now() + days * DAY)), undefined);
    setOpen(false);
  };
  return (
    <aside
      data-ad
      aria-label="DexCompare Premium"
      className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-xl border border-line bg-surface p-4 shadow-lg"
    >
      <button type="button" onClick={() => silence(14)} aria-label="Close" className="absolute right-2 top-2 rounded p-1 text-muted hover:text-ink">
        ✕
      </button>
      <p className="pr-6 text-sm font-semibold text-ink">Premium: an email when sold-out Pokémon product is back in stock</p>
      <p className="mt-1 text-xs text-muted">{PREMIUM_PRICE_LINE}.</p>
      <a href="/premium" onClick={() => silence(30)} className="btn-primary mt-3 inline-flex text-sm">
        Try Premium free
      </a>
    </aside>
  );
}
