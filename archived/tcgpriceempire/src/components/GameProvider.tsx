"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GAMES_COOKIE, GAME_KEYS, normalizeGames, type GameKey } from "@/lib/games";

// "Which TCGs do you play?" — the visitor's multi-select, mirrored from the
// `games` cookie (the server reads the same cookie via getSelectedGames()).
interface GameCtx {
  games: GameKey[]; // selected games, canonical order, never empty
  chosen: boolean; // has the visitor made an explicit choice yet?
  setGames: (games: GameKey[]) => void;
}

const Ctx = createContext<GameCtx | null>(null);

export function GameProvider({
  initial,
  initialChosen,
  children,
}: {
  initial: GameKey[];
  initialChosen: boolean;
  children: React.ReactNode;
}) {
  const [games, setState] = useState<GameKey[]>(initial);
  const [chosen, setChosen] = useState(initialChosen);
  const router = useRouter();

  // Static pages are prerendered with the default baked in; reconcile with the
  // real cookie after mount (post-hydration, so no mismatch).
  useEffect(() => {
    const m = document.cookie.match(new RegExp(`(?:^|; )${GAMES_COOKIE}=([^;]*)`));
    if (!m) return;
    setChosen(true);
    const fromCookie = normalizeGames(decodeURIComponent(m[1]));
    if (fromCookie.join(",") !== games.join(",")) setState(fromCookie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setGames = useCallback(
    (next: GameKey[]) => {
      const clean = next.length ? GAME_KEYS.filter((k) => next.includes(k)) : [...GAME_KEYS];
      setState(clean);
      setChosen(true);
      // 1-year cookie; server components read it via getSelectedGames().
      document.cookie = `${GAMES_COOKIE}=${encodeURIComponent(clean.join(","))}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      router.refresh();
    },
    [router]
  );

  return <Ctx.Provider value={{ games, chosen, setGames }}>{children}</Ctx.Provider>;
}

export function useGames(): GameCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGames must be used within <GameProvider>");
  return ctx;
}
