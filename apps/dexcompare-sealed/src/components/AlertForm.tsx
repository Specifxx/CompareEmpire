"use client";

import { useState } from "react";

export function AlertForm({
  productId,
  market,
  regionName,
  inStock,
  compact = false,
}: {
  productId: string;
  market: string;
  regionName: string;
  inStock: boolean;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, productId, market, website: hp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong — please try again.");
      setState("done");
      setMsg(
        inStock
          ? `Done. It's in stock now, so we'll email you the next time it sells out and comes back in ${regionName}.`
          : `Done. We'll email ${email} as soon as a store in ${regionName} has it in stock.`,
      );
    } catch (err) {
      setState("error");
      setMsg((err as Error).message);
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-open/30 bg-open-soft px-4 py-3 text-sm font-medium text-open" role="status">
        ✓ {msg}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "" : "rounded-xl border border-line bg-raised p-4"}>
      {!compact && (
        <div className="mb-3">
          <div className="font-semibold">{inStock ? "Get restock alerts" : "Email me when it's back in stock"}</div>
          <p className="mt-0.5 text-sm text-muted">
            {inStock ? "We'll tell you when it next sells out and restocks." : `One email the moment any ${regionName} store we track has it.`} No account,
            unsubscribe any time.
          </p>
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm outline-none focus:border-ink/40"
        />
        {/* Honeypot: people never see or fill this; bots do. */}
        <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} name="website" className="hidden" aria-hidden="true" />
        <button type="submit" disabled={state === "busy"} className="btn-primary shrink-0">
          {state === "busy" ? "Saving…" : "Notify me"}
        </button>
      </div>
      {state === "error" && (
        <p className="mt-2 text-sm text-brand" role="alert">
          {msg}
        </p>
      )}
    </form>
  );
}
