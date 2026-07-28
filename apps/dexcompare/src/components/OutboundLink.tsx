"use client";

import type { ReactNode } from "react";
import { outboundRel } from "@/lib/affiliate";

// An outbound "buy" link. Used to fire a click beacon (/api/click) to count
// store/eBay link usage in our own DB — that write was pure Neon-egress
// liability for a number nothing ever read, so it's gone (see api/click/route.ts).
// retailer/country/kind are kept in the prop signature so every call site
// (there are many) doesn't need touching; they're currently unused.
export function OutboundLink({
  href,
  className,
  children,
}: {
  href: string;
  retailer: string;
  country: string;
  kind?: "single" | "sealed" | "game";
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel={outboundRel(href)} className={className}>
      {children}
    </a>
  );
}
