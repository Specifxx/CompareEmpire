"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Renders its children only on the given path prefixes. Lets the layout keep the
// footer affiliate banners on commerce pages and off low-intent ones (contact,
// login, trade, proxy…) without turning the server-rendered ad components into
// client components — they're passed through as children.
export function PathGate({ allow, children }: { allow: string[]; children: ReactNode }) {
  const pathname = usePathname() || "/";
  const ok = allow.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/")
  );
  return ok ? <>{children}</> : null;
}
