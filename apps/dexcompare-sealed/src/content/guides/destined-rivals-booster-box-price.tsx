// Guide: the Destined Rivals booster box price (2026-11-05): set-booster-box-price.tsx with this set's codes.
import type { RegionInfo } from "@/lib/regions";
import type { GuideData } from "./data";
import { setBoxBody, setBoxOutline, type SetBoxSpec } from "./set-booster-box-price";

const SPEC: SetBoxSpec = {
  slug: "destined-rivals-booster-box-price",
  code: "sv10",
  other: "sv9",
  relation: "before",
  links: [
    { slug: "cheapest-pokemon-booster-box", label: "The cheapest booster box" },
    { slug: "are-pokemon-booster-boxes-worth-it", label: "Are booster boxes worth it?" },
  ],
};

export function outline(r: RegionInfo, data: GuideData) {
  return setBoxOutline(SPEC, r, data);
}
export const Body = setBoxBody(SPEC);
