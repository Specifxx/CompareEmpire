"use client";

import Link from "next/link";
import { PREMIUM_BUY, PREMIUM_PRICE_LINE, PREMIUM_SIGN_IN, refreshPremium, untilLine, writeStored } from "@/lib/premium-member";
import { usePremium } from "./usePremium";
import { useState } from "react";

/** The /premium page's call to action: sign in, get Premium, or the member's own status. */
export function PremiumPanel() {
  const v = usePremium();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function recheck() {
    setBusy(true);
    const info = await refreshPremium(true);
    setBusy(false);
    setNote(!info ? "You are signed out. Sign in again." : info.premium ? "Premium is active." : "No active Premium on that account yet.");
    // usePremium re-reads storage on the next load; a reload keeps the sketch simple.
    if (info) location.reload();
  }

  if (v.status === "loading") return <div className="card p-5 text-sm text-muted" aria-live="polite">Checking your membership…</div>;
  if (v.status === "member") {
    return (
      <div className="card p-5">
        <p className="font-semibold">You are a Premium member{v.info.who ? ` (${v.info.who})` : ""}.</p>
        {untilLine(v.info.until) && <p className="mt-1 text-sm text-muted">Current period ends {untilLine(v.info.until)}.</p>}
        <p className="mt-3 flex flex-wrap gap-3">
          <Link href="/watches" className="btn-primary">My watches</Link>
          <button type="button" className="btn-ghost" onClick={() => { writeStored(null); location.reload(); }}>Sign out on this device</button>
        </p>
        <p className="mt-3 text-sm text-muted">To manage billing, open <a className="underline" href="https://riftcompare.com/profile">your RiftCompare account</a>.</p>
      </div>
    );
  }
  if (v.status === "free") {
    return (
      <div className="card p-5">
        <p className="font-semibold">Signed in{v.info.who ? ` as ${v.info.who}` : ""}, no active Premium yet.</p>
        <p className="mt-1 text-sm text-muted">Premium is one RiftCompare membership that also works here: {PREMIUM_PRICE_LINE}.</p>
        <p className="mt-3 flex flex-wrap gap-3">
          <a href={PREMIUM_BUY} className="btn-primary">Start 14-day free trial</a>
          <button type="button" className="btn-ghost" disabled={busy} onClick={recheck}>I have subscribed: check again</button>
        </p>
        {note && <p className="mt-2 text-sm" aria-live="polite">{note}</p>}
      </div>
    );
  }
  return (
    <div className="card p-5">
      <p className="font-semibold">US$4.99 a month or US$39.99 a year, 14 days free</p>
      <p className="mt-1 text-sm text-muted">Card needed for the trial, cancel any time. One RiftCompare account covers both sites.</p>
      <p className="mt-3 flex flex-wrap gap-3">
        <a href={PREMIUM_BUY} className="btn-primary">Start 14-day free trial</a>
        <a href={PREMIUM_SIGN_IN} className="btn-ghost">I am already a member: sign in</a>
      </p>
      <p className="mt-2 text-sm text-muted">Sign-in and payment happen on riftcompare.com; you come straight back here.</p>
    </div>
  );
}
