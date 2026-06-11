"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";

// Compact email-capture form for the card page: "tell me when this card hits
// $X" (or any meaningful drop when no target is given). No account — just an
// email; the subscribe API handles caps, throttling and the confirmation send.
export function PriceAlertForm({
  cardId,
  cardName,
  currentCents,
}: {
  cardId: string;
  cardName?: string;
  currentCents?: number | null;
}) {
  const [email, setEmail] = useState("");
  const [target, setTarget] = useState(""); // dollars, free-text — converted to cents on submit
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const name = cardName ?? "this card";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr) return;

    // Optional target: dollars in the box, integer cents over the wire.
    let targetCents: number | null = null;
    const t = target.trim().replace(/^\$/, "");
    if (t) {
      const dollars = Number(t);
      if (!Number.isFinite(dollars) || dollars <= 0) {
        setError("Enter a valid target price, or leave it blank.");
        setState("error");
        return;
      }
      targetCents = Math.round(dollars * 100);
    }

    setState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/alerts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addr, cardId, ...(targetCents != null ? { targetCents } : {}) }),
      });
      if (res.ok) {
        setState("done");
      } else {
        const data = await res.json().catch(() => null);
        setError(typeof data?.error === "string" ? data.error : null);
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="card-surface mt-4 border-brand-500/40 bg-brand-500/10 p-4 text-center">
        <div className="text-sm font-bold text-brand-400">Price alert is on ✓</div>
        <p className="mt-1 text-xs text-slate-300">
          We&apos;ll email you when {name} {target.trim() ? "hits your target" : "drops in price"}. Check your inbox
          for a confirmation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card-surface mt-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-semibold text-white">🔔 Email me when the price drops</label>
        <span className="chip bg-brand-500/15 text-[11px] font-semibold text-brand-400">Free · no account</span>
      </div>
      <p className="mb-3 mt-0.5 text-xs text-slate-400">
        Set a target price{currentCents != null ? ` (currently ${formatMoney(currentCents, "USD")})` : ""} or leave
        it blank to hear about any real drop. We check once a day. Unsubscribe anytime.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input flex-1"
          aria-label="Your email"
        />
        <div className="relative sm:w-32">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="target"
            className="input pl-7"
            aria-label="Target price in US dollars (optional)"
          />
        </div>
        <button type="submit" disabled={state === "submitting"} className="btn-primary shrink-0">
          {state === "submitting" ? "Adding…" : "Notify me"}
        </button>
      </div>
      {state === "error" && (
        <p className="mt-2 text-xs text-rose-400">
          {error ?? "Something went wrong — please try again in a moment."}
        </p>
      )}
    </form>
  );
}
