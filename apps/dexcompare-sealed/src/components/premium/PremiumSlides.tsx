"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// The home page's Premium slider (owner, 2026-11-10: "a nice Premium button on the homepage … and a slider"). An in-page banner, part
// of the page's flow (never fixed, never covering anything, not a pop-up), that turns through what Premium does every 5 seconds. The
// first slide is in the server's HTML at full height, so nothing moves when the script arrives; motion stops for prefers-reduced-motion,
// on hover and on focus. Hidden for a member.

const SLIDES = [
  { kicker: "New · DexCompare Premium", title: "Sold out? We'll tell you the day it's back.", body: "Tap “Email me when it's back” on any sold-out booster box, ETB or collection. We check every store daily." },
  { kicker: "Premium", title: "200 price alerts. One watch list.", body: "Set alerts on everything you're chasing and see today's lowest price for each, in one place." },
  { kicker: "14 days free", title: "US$4.99 a month, or US$39.99 a year.", body: "Try it free for 14 days, cancel any time. Comparing prices stays free for everyone." },
];

export function PremiumSlides({ className = "" }: { className?: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [member, setMember] = useState(false);

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem("dex_premium_v1") || "null");
      if (v?.premium) setMember(true);
    } catch {
      /* no storage: show it */
    }
  }, []);

  useEffect(() => {
    if (paused || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [paused]);

  if (member) return null;
  return (
    <section
      aria-roledescription="carousel"
      aria-label="DexCompare Premium"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1d2b5a] via-[#28397a] to-[#3b2a7a] text-white shadow-lift ${className}`}
    >
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-amber-400/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="relative grid items-center gap-5 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
        <div className="grid min-h-[132px] sm:min-h-[112px]">
          {SLIDES.map((s, n) => (
            <div
              key={n}
              role="group"
              aria-roledescription="slide"
              aria-label={`${n + 1} of ${SLIDES.length}`}
              aria-hidden={n !== i}
              className={`col-start-1 row-start-1 transition-all duration-500 ${n === i ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0"}`}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300">{s.kicker}</p>
              <p className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">{s.title}</p>
              <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-center">
          <Link
            href="/premium"
            prefetch={false}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-6 font-bold text-white shadow-md transition hover:brightness-105"
          >
            Try Premium free
          </Link>
          <span className="text-xs text-white/70">14 days free · cancel any time</span>
        </div>
      </div>
      <div className="relative flex gap-2 px-6 pb-4 sm:px-8">
        {SLIDES.map((_, n) => (
          <button
            key={n}
            type="button"
            aria-label={`Show slide ${n + 1}`}
            aria-current={n === i}
            onClick={() => setI(n)}
            className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"}`}
          />
        ))}
      </div>
    </section>
  );
}
