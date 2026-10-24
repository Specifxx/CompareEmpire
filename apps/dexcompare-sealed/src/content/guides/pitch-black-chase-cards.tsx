// Guide: the Pitch Black chase cards (set-reveal guides, 2026-10-24). Built by set-reveal.tsx from REVEALS.me5, sourced there.
import type { RegionInfo } from "@/lib/regions";
import type { GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import { REVEALS, revealBody, revealOutline } from "./set-reveal";

const GUIDE = GUIDE_BY_SLUG.get("pitch-black-chase-cards")!;
export const outline = (r: RegionInfo, data: GuideData) => revealOutline(GUIDE, "chase", REVEALS.me5, r, data);
export const Body = revealBody(GUIDE, "chase", REVEALS.me5);
