// Guide: the Black Bolt booster box price (2026-11-05): set-booster-box-price.tsx with this set's codes.
import type { RegionInfo } from "@/lib/regions";
import type { GuideData } from "./data";
import { setBoxBody, setBoxOutline, type SetBoxSpec } from "./set-booster-box-price";

const SPEC: SetBoxSpec = {
  slug: "black-bolt-booster-box-price",
  code: "zsv10pt5",
  other: "rsv10pt5",
  relation: "twin",
  links: [
    { slug: "cheapest-pokemon-booster-box", label: "The cheapest booster box" },
    { slug: "booster-box-vs-etb-vs-booster-bundle", label: "Booster box vs ETB vs bundle" },
  ],
};

export function outline(r: RegionInfo, data: GuideData) {
  return setBoxOutline(SPEC, r, data);
}
export const Body = setBoxBody(SPEC);
