// Server-only: resolve the visitor's region. Resolution order:
//   1. Explicit choice — the `country` cookie set by the switcher.
//   2. Geo default — Vercel's `x-vercel-ip-country` header.
//   3. US (the data baseline) for everyone else, and locally.
import { cookies, headers } from "next/headers";
import { COUNTRY_COOKIE, normalizeCountry, type Country } from "./country";

export function getCountry(): Country {
  const chosen = cookies().get(COUNTRY_COOKIE)?.value;
  if (chosen) return normalizeCountry(chosen);
  return normalizeCountry(headers().get("x-vercel-ip-country"));
}
