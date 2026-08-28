// The One Piece Card Game set catalogue used across OPCompare, newest first.
export interface OnePieceSet {
  code: string; name: string; slug: string; series: string;
  releaseDate: string; total: number; logo: string | null; symbol: string | null;
}
const S = (code: string, name: string, slug: string, series: string, releaseDate: string, total: number): OnePieceSet =>
  ({ code, name, slug, series, releaseDate, total, logo: null, symbol: null });

export const ONE_PIECE_SETS: OnePieceSet[] = [
  S("OP11", "A Fist of Divine Speed", "a-fist-of-divine-speed", "Booster", "2025/05/30", 120),
  S("OP10", "Royal Blood", "royal-blood", "Booster", "2025/02/21", 119),
  S("EB02", "Anime 25th Collection", "anime-25th-collection", "Extra Booster", "2025/02/28", 80),
  S("OP09", "Emperors in the New World", "emperors-in-the-new-world", "Booster", "2024/11/22", 118),
  S("PRB01", "Premium Booster -The Best-", "premium-booster-the-best", "Premium", "2024/09/20", 120),
  S("OP08", "Two Legends", "two-legends", "Booster", "2024/09/13", 118),
  S("OP07", "500 Years in the Future", "500-years-in-the-future", "Booster", "2024/06/28", 118),
  S("OP06", "Wings of the Captain", "wings-of-the-captain", "Booster", "2024/03/08", 118),
  S("EB01", "Memorial Collection", "memorial-collection", "Extra Booster", "2024/01/26", 71),
  S("OP05", "Awakening of the New Era", "awakening-of-the-new-era", "Booster", "2023/12/08", 119),
  S("OP04", "Kingdoms of Intrigue", "kingdoms-of-intrigue", "Booster", "2023/09/22", 114),
  S("OP03", "Pillars of Strength", "pillars-of-strength", "Booster", "2023/06/30", 122),
  S("OP02", "Paramount War", "paramount-war", "Booster", "2023/03/10", 121),
  S("OP01", "Romance Dawn", "romance-dawn", "Booster", "2022/12/02", 121),
  S("ST21", "EX Gear 5", "ex-gear-5", "Starter Deck", "2024/09/13", 17),
  S("ST13", "The Three Brothers", "the-three-brothers", "Starter Deck", "2023/11/03", 17),
  S("ST10", "The Three Captains", "the-three-captains", "Ultra Deck", "2023/08/25", 17),
  S("ST06", "Absolute Justice", "absolute-justice", "Starter Deck", "2023/02/24", 17),
  S("ST04", "Animal Kingdom Pirates", "animal-kingdom-pirates", "Starter Deck", "2022/12/02", 17),
  S("ST03", "The Seven Warlords of the Sea", "the-seven-warlords-of-the-sea", "Starter Deck", "2022/12/02", 17),
  S("ST02", "Worst Generation", "worst-generation", "Starter Deck", "2022/12/02", 17),
  S("ST01", "Straw Hat Crew", "straw-hat-crew", "Starter Deck", "2022/12/02", 17),
];
