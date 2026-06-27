"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CinematicNavMenu } from "./CinematicNavMenu";

// Shared open/close state for the full-screen cinematic nav, so the left-rail
// launcher, the navbar trigger and the ⌘K shortcut all drive the same overlay.
type MegaMenuCtx = { open: boolean; setOpen: (v: boolean) => void };
const Ctx = createContext<MegaMenuCtx | null>(null);

export function useMegaMenu(): MegaMenuCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMegaMenu must be used within <MegaMenuProvider>");
  return c;
}

export function MegaMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  // ⌘K / Ctrl+K toggles the menu (a recognisable "command palette" gesture).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Ctx.Provider value={{ open, setOpen }}>
      {children}
      <CinematicNavMenu />
    </Ctx.Provider>
  );
}
