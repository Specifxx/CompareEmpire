import { prisma } from "@/lib/db";
import { GAME_KEYS } from "@/lib/games";

// Drifting card collage behind the hero: one iconic (highest-value, with image)
// card per game, absolutely positioned at the hero's edges with varied tilt and
// animation timing so the page feels alive the moment it loads. Hidden below
// lg (they'd crowd the headline on phones) and disabled for reduced motion.
const SLOTS = [
  { className: "left-[2%] top-[12%]", tilt: "-8deg", duration: "7s", delay: "0s" },
  { className: "left-[10%] bottom-[8%]", tilt: "5deg", duration: "8s", delay: "1.2s" },
  { className: "right-[2%] top-[10%]", tilt: "7deg", duration: "7.5s", delay: "0.6s" },
  { className: "right-[10%] bottom-[10%]", tilt: "-5deg", duration: "8.5s", delay: "1.8s" },
  { className: "left-[22%] top-[4%]", tilt: "3deg", duration: "9s", delay: "0.3s" },
];

export async function HeroCards() {
  const cards = (
    await Promise.all(
      GAME_KEYS.map((game) =>
        prisma.card
          .findFirst({
            where: { game, kind: "single", marketPriceCents: { not: null }, imageUrl: { not: null } },
            orderBy: { marketPriceCents: "desc" },
            select: { id: true, name: true, imageUrl: true },
          })
          .catch(() => null)
      )
    )
  ).filter((c): c is { id: string; name: string; imageUrl: string | null } => !!c?.imageUrl);
  if (cards.length < 3) return null;

  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block" aria-hidden>
      {cards.slice(0, SLOTS.length).map((c, i) => {
        const s = SLOTS[i];
        return (
          <img
            key={c.id}
            src={c.imageUrl as string}
            alt=""
            loading="lazy"
            className={`absolute ${s.className} w-24 animate-drift rounded-lg opacity-25 shadow-2xl xl:w-28`}
            style={{ ["--tilt" as string]: s.tilt, animationDuration: s.duration, animationDelay: s.delay }}
          />
        );
      })}
    </div>
  );
}
