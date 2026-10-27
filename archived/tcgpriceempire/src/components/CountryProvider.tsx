"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES, COUNTRY_COOKIE, normalizeCountry, type Country } from "@/lib/country";

interface CountryCtx {
  country: Country;
  setCountry: (c: Country) => void;
}

const Ctx = createContext<CountryCtx | null>(null);

export function CountryProvider({ initial, children }: { initial: Country; children: React.ReactNode }) {
  const [country, setState] = useState<Country>(initial);
  const router = useRouter();

  // Static pages are prerendered with the default baked in; reconcile with the
  // real cookie after mount (post-hydration, so no mismatch).
  useEffect(() => {
    const m = document.cookie.match(new RegExp(`(?:^|; )${COUNTRY_COOKIE}=([^;]*)`));
    if (!m) return;
    const fromCookie = normalizeCountry(decodeURIComponent(m[1]));
    if (fromCookie !== country) setState(fromCookie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCountry = useCallback(
    (c: Country) => {
      if (c === country || !COUNTRIES[c]) return;
      setState(c);
      document.cookie = `${COUNTRY_COOKIE}=${c}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      router.refresh(); // re-render server components (links/copy) for the new region
    },
    [country, router]
  );

  return <Ctx.Provider value={{ country, setCountry }}>{children}</Ctx.Provider>;
}

export function useCountry(): CountryCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCountry must be used within <CountryProvider>");
  return ctx;
}
