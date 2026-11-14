"use client";

import { useEffect } from "react";
import { installPaidVisitTagger } from "@/lib/paid-visit";

// A paid ad visit (utm_medium=paid, the 2026-11-14 Meta test) adds "fbad" to the sub-id of
// every affiliate link it opens, so RiftCompare's earnings dashboard can say what the ad
// earned. Organic visits are untouched. See lib/paid-visit.ts.
export function PaidVisitTagger() {
  useEffect(() => installPaidVisitTagger(), []);
  return null;
}
