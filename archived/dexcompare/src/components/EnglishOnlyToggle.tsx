"use client";

import { useState } from "react";

// Toggles a `.hide-foreign` class on the price list (by id) so foreign-language
// listings (mostly cheap JP/KR/CN eBay printings flagged server-side with
// data-foreign="true") can be hidden — the #1 "too good to be true" complaint.
// Renders nothing when there are no foreign rows to hide.
export function EnglishOnlyToggle({ targetId, foreignCount }: { targetId: string; foreignCount: number }) {
  const [on, setOn] = useState(false);
  if (foreignCount <= 0) return null;
  return (
    <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-slate-400">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked);
          document.getElementById(targetId)?.classList.toggle("hide-foreign", e.target.checked);
        }}
        className="accent-brand-500"
      />
      English only{on ? ` (${foreignCount} hidden)` : ""}
    </label>
  );
}
