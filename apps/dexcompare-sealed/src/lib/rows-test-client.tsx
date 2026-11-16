"use client";

import { track } from "@vercel/analytics";
import { createContext, useContext, useEffect, useState } from "react";
import { outcomeOf } from "./ab";
import { RT_SEEN, RT_STORE, parseRtArm, rtActive, rtArm, rtKey, type RtArm } from "./rows-test";

// The browser half of lib/rows-test.ts. Everything fails to "no test": no storage, a date outside the test, a server render draw the
// control (every row) and send nothing.

export interface RtVisit {
  arm: RtArm;
  k: string;
}
export const RowsTestContext = createContext<RtVisit | null>(null);
export const useRowsTest = (): RtVisit | null => useContext(RowsTestContext);

/** This visitor's arm for an eligible table; null until the page runs, outside the dates, or without storage. Sends rt_seen once a visit. */
export function useRowsTestVisit(enabled: boolean, region: string): RtVisit | null {
  const [visit, setVisit] = useState<RtVisit | null>(null);
  useEffect(() => {
    if (!enabled) return;
    try {
      if (!rtActive(Date.now())) return;
      let arm = parseRtArm(window.localStorage.getItem(RT_STORE));
      if (!arm) {
        arm = rtArm(window.crypto.getRandomValues(new Uint8Array(1))[0]);
        window.localStorage.setItem(RT_STORE, arm);
        if (window.localStorage.getItem(RT_STORE) !== arm) return;
      }
      const v = { arm, k: rtKey(region, arm) };
      setVisit(v);
      send("rt_seen", v);
    } catch {
      /* no storage: the control */
    }
  }, [enabled, region]);
  return visit;
}

/** Once a visit per event name and key. */
function send(name: string, v: RtVisit): void {
  try {
    const key = `${RT_SEEN}:${name}`;
    if (window.sessionStorage.getItem(key) === v.k) return;
    window.sessionStorage.setItem(key, v.k);
    track(name, { k: v.k });
  } catch {
    /* analytics must never get in the way of the link */
  }
}

export const rtMore = (v: RtVisit | null): void => {
  if (v) send("rt_more", v);
};

/** A buy click inside the table: rt_store for a store row, and rt_paid for any link that pays. */
export function rtClick(v: RtVisit | null, retailer: string, placement: string, rel: string): void {
  if (!v) return;
  const outcome = outcomeOf(retailer, placement);
  const paid = outcome !== "ab_store" || /\bsponsored\b/.test(rel);
  if (outcome === "ab_store") send("rt_store", v);
  if (paid) send("rt_paid", v);
}
