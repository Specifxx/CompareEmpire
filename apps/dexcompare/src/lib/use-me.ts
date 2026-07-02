"use client";

import { useEffect, useState } from "react";
import type { MenuUser } from "@/components/UserMenu";

// Client-side session hook. One /api/me fetch per page load, shared by every
// consumer (NavUser, AccountSync) via a module-level promise cache — the chrome
// renders session-less on the server (so pages can be cached/ISR) and hydrates
// the signed-in state from here.
let mePromise: Promise<MenuUser | null> | null = null;

function fetchMe(): Promise<MenuUser | null> {
  if (!mePromise) {
    mePromise = fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => d.user ?? null)
      .catch(() => null);
  }
  return mePromise;
}

// Re-fetch on next use (e.g. after login/logout navigation re-mounts the chrome).
export function invalidateMe() {
  mePromise = null;
}

export function useMe(): { user: MenuUser | null; loaded: boolean } {
  const [state, setState] = useState<{ user: MenuUser | null; loaded: boolean }>({
    user: null,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((user) => {
      if (!cancelled) setState({ user, loaded: true });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
