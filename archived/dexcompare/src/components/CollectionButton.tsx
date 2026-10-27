"use client";

import { useEffect, useState } from "react";
import { addQty, getQty } from "@/lib/collection-client";

// "Add to collection" control for the card page: a single button until you own a
// copy, then a quantity stepper. Backed by localStorage (collection-client), so it
// works without an account.
export function CollectionButton({ cardId }: { cardId: string }) {
  const [qty, setQtyState] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setQtyState(getQty(cardId));
    const h = (e: Event) => {
      const changed = (e as CustomEvent<{ id?: string | null }>).detail?.id;
      if (changed == null || changed === cardId) setQtyState(getQty(cardId));
    };
    window.addEventListener("collection-change", h);
    return () => window.removeEventListener("collection-change", h);
  }, [cardId]);

  const icon = (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M8 3v4M16 3v4M4 11h16" />
    </svg>
  );

  if (!mounted || qty === 0) {
    return (
      <button onClick={() => addQty(cardId, 1)} className="btn bg-ink-800 text-slate-200 hover:bg-ink-700">
        {icon}
        Add to collection
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-brand-500/15 px-1.5 py-1">
      <button
        onClick={() => addQty(cardId, -1)}
        aria-label="Remove one copy"
        className="grid h-7 w-7 place-items-center rounded-md text-brand-300 hover:bg-ink-800"
      >
        −
      </button>
      <span className="min-w-[64px] text-center text-sm font-semibold text-brand-300">
        {qty} owned
      </span>
      <button
        onClick={() => addQty(cardId, 1)}
        aria-label="Add one copy"
        className="grid h-7 w-7 place-items-center rounded-md text-brand-300 hover:bg-ink-800"
      >
        +
      </button>
    </div>
  );
}
