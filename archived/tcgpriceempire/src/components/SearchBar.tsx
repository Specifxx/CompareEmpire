"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GAMES, type GameKey } from "@/lib/games";
import { formatMoney } from "@/lib/format";
import type { CardTileData } from "@/lib/cards";

// Navbar search with typeahead. Results come from /api/search, scoped to the
// visitor's selected games server-side (the API reads the games cookie).
export function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [results, setResults] = useState<CardTileData[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function onChange(value: string) {
    setQ(value);
    clearTimeout(debounce.current);
    const query = value.trim();
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        /* network hiccup — keep the old dropdown */
      }
    }, 180);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    const query = q.trim();
    router.push(query ? `/browse?q=${encodeURIComponent(query)}` : "/browse");
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <form onSubmit={submit}>
        <input
          type="search"
          value={q}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search any card across your games…"
          className="input"
          aria-label="Search cards"
        />
      </form>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl">
          <ul className="max-h-96 overflow-y-auto">
            {results.map((c) => {
              const g = GAMES[c.game as GameKey];
              return (
                <li key={c.id}>
                  <Link
                    href={`/card/${c.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-ink-800"
                  >
                    <div className="grid h-12 w-9 shrink-0 place-items-center overflow-hidden rounded bg-ink-850">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.imageUrl} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-600">{g?.icon}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{c.name}</div>
                      <div className="truncate text-[11px] text-slate-500">
                        <span style={{ color: g?.color }}>{g?.short}</span> · {c.setName}
                      </div>
                    </div>
                    {c.marketPriceCents != null && (
                      <div className="shrink-0 text-sm font-bold text-accent">{formatMoney(c.marketPriceCents, "USD")}</div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <button
            onClick={() => {
              setOpen(false);
              router.push(`/browse?q=${encodeURIComponent(q.trim())}`);
            }}
            className="block w-full border-t border-ink-700 px-3 py-2 text-left text-xs font-semibold text-brand-400 hover:bg-ink-800"
          >
            See all results for “{q.trim()}” →
          </button>
        </div>
      )}
    </div>
  );
}
