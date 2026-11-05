// Guide: the Phantasmal Flames booster box price (2026-11-05): set-booster-box-price.tsx with this set's codes.
import type { RegionInfo } from "@/lib/regions";
import type { GuideData } from "./data";
import { setBoxBody, setBoxOutline, type SetBoxSpec } from "./set-booster-box-price";

const SPEC: SetBoxSpec = {
  slug: "phantasmal-flames-booster-box-price",
  code: "me2",
  other: "me1",
  relation: "before",
  links: [
    { slug: "pokemon-mega-evolution-sealed-price-guide", label: "Mega Evolution price guide" },
    { slug: "phantasmal-flames-chase-cards", label: "Phantasmal Flames chase cards" },
  ],
};

export function outline(r: RegionInfo, data: GuideData) {
  return setBoxOutline(SPEC, r, data);
}
export const Body = setBoxBody(SPEC);
