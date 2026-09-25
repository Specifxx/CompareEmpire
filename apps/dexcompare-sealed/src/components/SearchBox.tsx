"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Region } from "@/lib/regions";

export function SearchBox({ region, size = "sm", autoFocus = false }: { region: Region; size?: "sm" | "lg"; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const big = size === "lg";
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        router.push(term ? `/${region}/sealed?q=${encodeURIComponent(term)}` : `/${region}/sealed`);
      }}
      className={`flex w-full items-center gap-2 rounded-full border border-line bg-surface ${big ? "p-1.5 pl-5 shadow-lift" : "px-3 py-1.5"}`}
    >
      <svg viewBox="0 0 20 20" className={`${big ? "h-5 w-5" : "h-4 w-4"} shrink-0 text-faint`} aria-hidden="true">
        <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="m14 14 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        type="search"
        placeholder={big ? "Search a set or product — “Prismatic Evolutions ETB”" : "Search sealed…"}
        aria-label="Search sealed products"
        className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint ${big ? "py-2 text-base" : "text-sm"}`}
      />
      {big && (
        <button type="submit" className="btn-primary px-5 py-2.5">
          Search
        </button>
      )}
    </form>
  );
}
