"use client";

import { useEffect, useState } from "react";
import { activeStoreCode } from "@/lib/store-codes";

// A store's exclusive discount code beside its price (lib/store-codes.ts). A LABEL, never a discount applied to the
// price or a reason to re-rank. Decided after mount: whether a code is live depends on today's date, and the pages
// around it are cached for hours.
export function StoreCodeChip({ host, className }: { host: string | null | undefined; className?: string }) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const c = mounted ? activeStoreCode(host) : null;
  if (!c) return null;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(c.code).then(
          () => setCopied(true),
          () => setCopied(false),
        );
      }}
      className={`ml-1 inline-flex items-center rounded border border-dashed border-current px-1.5 text-[11px] font-semibold leading-4 text-open ${className ?? ""}`}
      title={`${c.name}'s code for DexCompare visitors: ${c.offer}. The price shown is before the code; items already on sale may be excluded. Tap to copy.`}
    >
      {copied ? "Copied ✓" : `${c.offer} · code ${c.code}`}
    </button>
  );
}
