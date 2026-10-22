"use client";

import { track } from "@vercel/analytics";
import type { AnalyticsEvent } from "./click-events";

/** Send one of lib/click-events.ts's events. Fire and forget: analytics never gets in the way of what the visitor did. */
export function send([name, props]: AnalyticsEvent): void {
  try {
    track(name, props);
  } catch {
    /* blocked or not loaded: nothing to do */
  }
}
