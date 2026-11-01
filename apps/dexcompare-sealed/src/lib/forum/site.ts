// DexCompare's forum settings (the rules are in ./core.ts, docs/forum.md).
import type { ForumSite } from "./core";

export const FORUM_SITE: ForumSite = {
  site: "dexcompare",
  siteName: "DexCompare",
  repo: "Specifxx/CompareEmpire",
  hosts: ["dexcompare.app", "www.dexcompare.app"],
  base: "/forum",
  topic: "Pokémon TCG",
  intro: "Talk Pokémon TCG sealed prices, deals, new sets and collections with other collectors, English and Japanese.",
  categories: [
    {
      "key": "new-sets",
      "name": "New set prices",
      "blurb": "Pre-orders, release week and how a new set's boxes and ETBs are pricing.",
      "prompts": [
        "Is the next set worth pre-ordering?",
        "Booster box or ETB: which is better value?"
      ]
    },
    {
      "key": "deals",
      "name": "Deals & where to buy",
      "blurb": "Good prices you spotted, store experiences and restocks.",
      "prompts": [
        "Which store shipped fastest for you?",
        "Best ETB price you've seen this week"
      ]
    },
    {
      "key": "japanese",
      "name": "Japanese sealed",
      "blurb": "Japanese boxes: prices, importing and which sets to buy.",
      "prompts": [
        "Cheapest way to buy Japanese boxes outside Japan?",
        "Which Japanese sets are worth holding?"
      ]
    },
    {
      "key": "collection",
      "name": "Collection talk",
      "blurb": "Sealed collecting, opening vs holding, and what you're chasing.",
      "prompts": [
        "Open it or keep it sealed?",
        "Your best pull this year (describe it!)"
      ]
    },
    {
      "key": "site",
      "name": "Site feedback",
      "blurb": "Ideas, bugs or a store we should add.",
      "prompts": [
        "A store we should compare"
      ]
    }
  ],
  reserved: ["dex compare", "pokemon company"],
};
