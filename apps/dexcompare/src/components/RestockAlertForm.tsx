"use client";

import { useState } from "react";
import { useCountry } from "./CountryProvider";

// Email capture for a featured product's restock alert. No account — just an email.
export function RestockAlertForm({ productSlug, shortName }: { productSlug: string; shortName: string }) {
  const { country } = useCountry();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr) return;
    setState("submitting");
    try {
      const res = await fetch("/api/restock/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addr, productSlug, market: country }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 p-4 text-center">
        <div className="text-sm font-bold text-brand-300">You&apos;re on the list ✓</div>
        <p className="mt-1 text-xs text-slate-300">
          We&apos;ll email you the moment {shortName} is back in stock in {country}. Check your inbox for a confirmation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-ink-700 bg-ink-900/60 p-4">
      <label className="text-sm font-semibold text-white">🔔 Email me when {shortName} restocks</label>
      <p className="mb-3 mt-0.5 text-xs text-slate-400">
        Free, no account. One email the second any {country} store has it in stock. Unsubscribe anytime.
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
        <button type="submit" disabled={state === "submitting"} className="btn-primary shrink-0">
          {state === "submitting" ? "Adding…" : "Notify me"}
        </button>
      </div>
      {state === "error" && (
        <p className="mt-2 text-xs text-rose-400">Something went wrong — please try again in a moment.</p>
      )}
    </form>
  );
}
