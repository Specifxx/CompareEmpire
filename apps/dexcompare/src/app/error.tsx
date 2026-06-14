"use client";

import { useEffect } from "react";
import Link from "next/link";

// Route-segment error boundary. Catches any render/runtime error in a page (e.g. a
// transient database hiccup) and shows a friendly, branded fallback with a retry —
// instead of Next's raw "Application error: a server-side exception" screen. The
// digest is logged + shown so a specific failure can still be traced in the logs.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the browser console + any attached error reporting.
    console.error("DexCompare route error", { digest: error?.digest, message: error?.message });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-5xl" aria-hidden>
        ⚠️
      </div>
      <h1 className="text-xl font-extrabold text-white">Something went wrong</h1>
      <p className="text-sm leading-relaxed text-slate-400">
        This page hit a snag while loading — it&apos;s usually temporary. Try again in a
        moment, or head back to the database.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button onClick={() => reset()} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          Go home
        </Link>
        <Link href="/browse" className="btn-ghost">
          Browse cards
        </Link>
      </div>
      {error?.digest && (
        <p className="text-[11px] text-slate-600">Reference: {error.digest}</p>
      )}
    </div>
  );
}
