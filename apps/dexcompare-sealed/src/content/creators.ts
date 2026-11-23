import type { Creator } from "@/lib/creators";

// Pokémon creators featured on /creators (owner, 2026-11-03). Empty until the
// first creator agrees: the page shows "Your channel here" spots, never an
// invented creator. HOW TO ADD ONE: append an entry; a square avatar goes in
// public/img/creators/<slug>.webp. Example:
//   {
//     slug: "some-creator",
//     name: "Some Creator",
//     blurb: "Pokémon booster box openings and set reviews",
//     links: [
//       { platform: "YouTube", url: "https://youtube.com/@somecreator", handle: "@somecreator" },
//       { platform: "TikTok", url: "https://tiktok.com/@somecreator", handle: "@somecreator" },
//     ],
//     tipUrl: "https://ko-fi.com/somecreator",
//     tags: ["Pack openings", "Set reviews"],
//     region: "AU",
//     avatar: "/img/creators/some-creator.webp",
//     since: "2026-11-10",
//   },
export const CREATORS: Creator[] = [
  {
    // Asked to be featured by email to compareempire@gmail.com (2026-11-23); owner approved: one video or post a week
    // mentioning DexCompare, creator code KAMITARU (his tracked link's utm_campaign=kamitaru).
    slug: "kamitaru",
    name: "Kamitaru",
    blurb: "Minecraft and Cobblemon streams, plus Pokémon TCG collecting",
    links: [
      { platform: "YouTube", url: "https://youtube.com/@kamitaru", handle: "@kamitaru" },
      { platform: "Twitch", url: "https://www.twitch.tv/kamitarutv", handle: "kamitarutv" },
      { platform: "TikTok", url: "https://www.tiktok.com/@kamitaruuu", handle: "@kamitaruuu" },
    ],
    tags: ["Streams", "Collecting"],
    region: "UK",
    since: "2026-11-24",
  },
];
