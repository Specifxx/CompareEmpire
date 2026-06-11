"use client";

import type { ReactNode } from "react";

// An outbound "buy" link that fires a click beacon before navigating, so we can
// count how many times each vendor/game link is used (verified in our own DB, no
// dependency on the partner's dashboard). The link stays a normal direct <a> —
// keeping affiliate attribution clean and adding zero redirect latency.
export function OutboundLink({
  href,
  retailer,
  game,
  kind = "single",
  className,
  children,
}: {
  href: string;
  retailer: string;
  game: string;
  kind?: string;
  className?: string;
  children: ReactNode;
}) {
  function log() {
    try {
      const blob = new Blob([JSON.stringify({ retailer, game, kind })], { type: "application/json" });
      navigator.sendBeacon("/api/click", blob);
    } catch {
      /* sendBeacon unsupported or blocked — ignore, never block the click */
    }
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className={className}
      onClick={log}
      onAuxClick={log}
    >
      {children}
    </a>
  );
}
