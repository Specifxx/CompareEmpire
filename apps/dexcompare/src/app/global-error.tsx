"use client";

import { useEffect } from "react";

// Root error boundary — catches errors thrown in the ROOT LAYOUT itself (which the
// per-route error.tsx can't), so even a total render failure shows a styled page
// rather than the raw exception screen. It REPLACES the layout, so it must render
// its own <html>/<body> and can't rely on Tailwind being present → inline styles.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("DexCompare global error", { digest: error?.digest, message: error?.message });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#0a0a0f",
          color: "#e2e8f0",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48 }} aria-hidden>
            ⚠️
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#94a3b8", maxWidth: 440, lineHeight: 1.5 }}>
            DexCompare hit an unexpected error. It&apos;s usually temporary — please try again.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => reset()}
              style={{
                background: "#d61a1a",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                padding: "10px 18px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                background: "#1f2937",
                color: "#fff",
                borderRadius: 8,
                padding: "10px 18px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>
          {error?.digest && (
            <p style={{ fontSize: 11, color: "#475569" }}>Reference: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
