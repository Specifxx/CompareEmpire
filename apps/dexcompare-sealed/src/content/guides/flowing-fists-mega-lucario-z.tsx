// Guide: flowing-fists-mega-lucario-z (set guides, 2026-11-03). Built by set-reveal.tsx from REVEALS.me7, sourced there.
import type { RegionInfo } from "@/lib/regions";
import type { GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import { REVEALS, revealBody, revealOutline } from "./set-reveal";

const GUIDE = GUIDE_BY_SLUG.get("flowing-fists-mega-lucario-z")!;
export const outline = (r: RegionInfo, data: GuideData) => revealOutline(GUIDE, "chase", REVEALS.me7, r, data);
export const Body = revealBody(GUIDE, "chase", REVEALS.me7);
