"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";
import { MiniCompare } from "./MiniCompare";

// Card Catcher — a Miniclip-style canvas arcade game. Real cards rain down;
// slide your binder to catch them. Every catch banks the card's REAL market
// value; fakes break your combo, missed real cards cost a life. Difficulty
// ramps in levels, with Poké Ball slow-mo and gold 2× power-ups.
//
// Engine notes: everything lives in refs (no React re-render per frame); React
// state only drives the menu/pause/game-over overlays. The canvas is never
// pixel-read, so cross-origin card art is safe to draw.

type GameCard = { id: string; name: string; slug: string | null; imageThumbUrl: string | null; rarity: string; priceCents: number };
type Falling = {
  card: GameCard | null; // null = power-up
  kind: "card" | "fake" | "slow" | "gold";
  x: number; y: number; vy: number; rot: number; vr: number;
  img: HTMLImageElement | null;
};
type Phase = "menu" | "playing" | "paused" | "over";

const W = 480, H = 640;
const CARD_W = 44, CARD_H = 62;
const BEST_KEY = "dx_catcher_best";

export function CardCatcher() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [finalScore, setFinalScore] = useState(0);
  const [finalLevel, setFinalLevel] = useState(1);
  const [bestCatch, setBestCatch] = useState<GameCard | null>(null);
  const [best, setBest] = useState(0);
  const [copied, setCopied] = useState(false);
  const phaseRef = useRef<Phase>("menu");
  phaseRef.current = phase;

  // Mutable engine state.
  const eng = useRef({
    cards: [] as GameCard[],
    imgs: new Map<string, HTMLImageElement>(),
    falling: [] as Falling[],
    paddleX: W / 2,
    score: 0,
    lives: 3,
    combo: 0,
    level: 1,
    elapsed: 0,
    spawnIn: 0.4,
    slowUntil: 0,
    goldUntil: 0,
    bestCatch: null as GameCard | null,
    toasts: [] as { text: string; x: number; y: number; t: number; color: string }[],
    keys: { left: false, right: false },
  });

  useEffect(() => {
    try { setBest(parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0); } catch { /* ignore */ }
  }, []);

  async function start() {
    const e = eng.current;
    // Fresh batch of real cards each run.
    try {
      const d = await fetch("/api/games/cards?count=80").then((r) => r.json());
      e.cards = (d.cards ?? []).filter((c: GameCard) => c.imageThumbUrl);
    } catch { e.cards = []; }
    if (!e.cards.length) return; // data missing — overlay shows a hint
    for (const c of e.cards) {
      if (!e.imgs.has(c.id) && c.imageThumbUrl) {
        const img = new Image();
        img.src = c.imageThumbUrl;
        e.imgs.set(c.id, img);
      }
    }
    Object.assign(e, {
      falling: [], paddleX: W / 2, score: 0, lives: 3, combo: 0, level: 1,
      elapsed: 0, spawnIn: 0.5, slowUntil: 0, goldUntil: 0, bestCatch: null, toasts: [],
    });
    setPhase("playing");
  }

  function gameOver() {
    const e = eng.current;
    setFinalScore(e.score);
    setFinalLevel(e.level);
    setBestCatch(e.bestCatch);
    setBest((b) => {
      const nb = Math.max(b, e.score);
      try { localStorage.setItem(BEST_KEY, String(nb)); } catch { /* full */ }
      return nb;
    });
    setPhase("over");
  }

  // Game loop + input — bound once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const e = eng.current;

    const onKey = (down: boolean) => (ev: KeyboardEvent) => {
      if (ev.key === "ArrowLeft" || ev.key === "a") e.keys.left = down;
      if (ev.key === "ArrowRight" || ev.key === "d") e.keys.right = down;
      if (down && (ev.key === "p" || ev.key === "Escape") && (phaseRef.current === "playing" || phaseRef.current === "paused")) {
        setPhase(phaseRef.current === "playing" ? "paused" : "playing");
      }
    };
    const kd = onKey(true), ku = onKey(false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    const toX = (clientX: number) => {
      const r = canvas.getBoundingClientRect();
      return ((clientX - r.left) / r.width) * W;
    };
    const onMove = (ev: PointerEvent) => { if (phaseRef.current === "playing") e.paddleX = toX(ev.clientX); };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onMove);

    let last = performance.now();
    let raf = 0;

    const spawn = () => {
      const r = Math.random();
      const speedBase = 90 + e.level * 26;
      const f: Falling = {
        card: null, kind: "card",
        x: 30 + Math.random() * (W - 60), y: -CARD_H,
        vy: speedBase * (0.8 + Math.random() * 0.5),
        rot: (Math.random() - 0.5) * 0.5, vr: (Math.random() - 0.5) * 1.2,
        img: null,
      };
      if (r < 0.06 + e.level * 0.004) f.kind = "fake";
      else if (r < 0.085) f.kind = "slow";
      else if (r < 0.105) f.kind = "gold";
      if (f.kind === "card" || f.kind === "fake") {
        const c = e.cards[Math.floor(Math.random() * e.cards.length)];
        f.card = c;
        f.img = e.imgs.get(c.id) ?? null;
        if (f.kind === "card" && c.priceCents >= 5000) f.vy *= 1.3; // chase cards fall faster
      }
      e.falling.push(f);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Background every frame (also under menus, for a lively backdrop).
      ctx.fillStyle = "#0e1116";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#13171f";
      for (let i = 0; i < 5; i++) ctx.fillRect(0, (i * 140 + ((now / 50) % 140)), W, 1);

      if (phaseRef.current !== "playing") return;

      e.elapsed += dt;
      const newLevel = 1 + Math.floor(e.elapsed / 20);
      if (newLevel > e.level) {
        e.level = newLevel;
        e.toasts.push({ text: `LEVEL ${e.level}!`, x: W / 2, y: H / 2, t: 1.4, color: "#ffcb05" });
      }

      // Input (keyboard) — pointer sets paddleX directly.
      const pv = 420 * dt;
      if (e.keys.left) e.paddleX -= pv;
      if (e.keys.right) e.paddleX += pv;
      const paddleW = 96;
      e.paddleX = Math.max(paddleW / 2, Math.min(W - paddleW / 2, e.paddleX));

      // Spawning ramps with level.
      e.spawnIn -= dt;
      if (e.spawnIn <= 0) {
        spawn();
        e.spawnIn = Math.max(0.28, 0.9 - e.level * 0.06) * (0.7 + Math.random() * 0.6);
      }

      const slowMo = now < e.slowUntil ? 0.45 : 1;
      const gold = now < e.goldUntil;

      // Update + draw falling items.
      const paddleY = H - 46;
      for (let i = e.falling.length - 1; i >= 0; i--) {
        const f = e.falling[i];
        f.y += f.vy * dt * slowMo;
        f.rot += f.vr * dt;

        // Catch test.
        const caught = f.y + CARD_H / 2 >= paddleY && f.y + CARD_H / 2 <= paddleY + 26 && Math.abs(f.x - e.paddleX) < paddleW / 2 + CARD_W / 3;
        if (caught) {
          e.falling.splice(i, 1);
          if (f.kind === "card" && f.card) {
            e.combo = Math.min(e.combo + 1, 20);
            const mult = (1 + Math.floor(e.combo / 4) * 0.5) * (gold ? 2 : 1);
            const gain = Math.round(f.card.priceCents * mult);
            e.score += gain;
            if (!e.bestCatch || f.card.priceCents > e.bestCatch.priceCents) e.bestCatch = f.card;
            e.toasts.push({ text: `+${formatMoney(gain, "USD")}${mult > 1 ? ` ×${mult.toFixed(1)}` : ""}`, x: f.x, y: paddleY - 12, t: 0.9, color: gold ? "#ffd23f" : "#34d399" });
          } else if (f.kind === "fake") {
            e.combo = 0;
            e.score = Math.max(0, e.score - 2000);
            e.toasts.push({ text: "FAKE! −$20", x: f.x, y: paddleY - 12, t: 0.9, color: "#f87171" });
          } else if (f.kind === "slow") {
            e.slowUntil = now + 5000;
            e.toasts.push({ text: "SLOW-MO!", x: f.x, y: paddleY - 12, t: 0.9, color: "#60a5fa" });
          } else if (f.kind === "gold") {
            e.goldUntil = now + 8000;
            e.toasts.push({ text: "GOLD ×2!", x: f.x, y: paddleY - 12, t: 0.9, color: "#ffd23f" });
          }
          continue;
        }

        // Missed (off-screen): real cards cost a life.
        if (f.y > H + CARD_H) {
          e.falling.splice(i, 1);
          if (f.kind === "card" && f.card) {
            e.lives -= 1;
            e.combo = 0;
            e.toasts.push({ text: "💔 missed", x: f.x, y: H - 80, t: 0.9, color: "#f87171" });
            if (e.lives <= 0) { gameOver(); return; }
          }
          continue;
        }

        // Draw item.
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        if (f.kind === "slow" || f.kind === "gold") {
          ctx.font = "30px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(f.kind === "slow" ? "🎱" : "🌟", 0, 0);
        } else {
          const glow = f.kind === "card" && f.card && f.card.priceCents >= 5000;
          if (glow) { ctx.shadowColor = "#ffd23f"; ctx.shadowBlur = 14; }
          if (f.img?.complete && f.img.naturalWidth) {
            ctx.drawImage(f.img, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
          } else {
            ctx.fillStyle = "#252b38";
            ctx.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
          }
          if (f.kind === "fake") {
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(239,68,68,0.45)";
            ctx.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 22px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("✖", 0, 0);
          }
        }
        ctx.restore();
      }

      // Paddle (binder).
      ctx.save();
      if (gold) { ctx.shadowColor = "#ffd23f"; ctx.shadowBlur = 16; }
      ctx.fillStyle = "#ee1515";
      ctx.beginPath();
      ctx.roundRect(e.paddleX - paddleW / 2, paddleY, paddleW, 16, 8);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(e.paddleX - paddleW / 2, paddleY + 6, paddleW, 4, 2);
      ctx.fill();
      ctx.restore();
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("📂", e.paddleX, paddleY - 8);

      // Toasts.
      for (let i = e.toasts.length - 1; i >= 0; i--) {
        const t = e.toasts[i];
        t.t -= dt;
        t.y -= 28 * dt;
        if (t.t <= 0) { e.toasts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(1, t.t * 2);
        ctx.fillStyle = t.color;
        ctx.font = t.text.startsWith("LEVEL") ? "bold 30px sans-serif" : "bold 15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(t.text, t.x, t.y);
        ctx.globalAlpha = 1;
      }

      // HUD.
      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(formatMoney(e.score, "USD"), 12, 26);
      ctx.textAlign = "right";
      ctx.fillText("♥".repeat(Math.max(0, e.lives)), W - 12, 26);
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "left";
      ctx.fillText(`LV ${e.level}${e.combo >= 4 ? `  ·  🔥 combo ×${(1 + Math.floor(e.combo / 4) * 0.5).toFixed(1)}` : ""}${now < e.goldUntil ? "  ·  🌟 GOLD ×2" : ""}${now < e.slowUntil ? "  ·  🎱 slow-mo" : ""}`, 12, 44);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function share() {
    const text = `Card Catcher 📂 I caught ${formatMoney(finalScore, "USD")} worth of Magic cards (level ${finalLevel})!\nCan you beat me? dexcompare.app/games/catcher`;
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white">📂 Card Catcher</h1>
          <p className="mt-1 text-sm text-slate-400">
            Catch the cards, bank their real value. Fakes break your combo — drops cost a life.
          </p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div className="text-base font-extrabold text-gold">{formatMoney(best, "USD")}</div>
          personal best
        </div>
      </div>

      <div className="card-surface relative overflow-hidden">
        <canvas ref={canvasRef} width={W} height={H} className="block w-full touch-none select-none" style={{ aspectRatio: `${W}/${H}` }} />

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink-950/85 p-6 text-center">
            {phase === "menu" && (
              <>
                <div className="text-5xl">📂</div>
                <h2 className="text-xl font-extrabold text-white">Ready to catch?</h2>
                <p className="max-w-xs text-sm text-slate-400">
                  Move with <strong className="text-white">mouse / touch / ← →</strong>. Catch real cards
                  (+market value), grab 🌟 gold ×2 and 🎱 slow-mo, dodge ✖ fakes. 3 lives. P to pause.
                </p>
                <button onClick={start} className="btn-primary text-base">▶ Start catching</button>
              </>
            )}
            {phase === "paused" && (
              <>
                <h2 className="text-xl font-extrabold text-white">Paused</h2>
                <button onClick={() => setPhase("playing")} className="btn-primary">▶ Resume</button>
              </>
            )}
            {phase === "over" && (
              <>
                <h2 className="animate-pop text-2xl font-extrabold text-white">Binder full!</h2>
                <div className="text-3xl font-extrabold text-gold">{formatMoney(finalScore, "USD")}</div>
                <p className="text-xs text-slate-400">caught across {finalLevel} {finalLevel === 1 ? "level" : "levels"} · best: {formatMoney(best, "USD")}</p>
                {bestCatch && (
                  <p className="text-sm text-slate-300">
                    Best catch: <strong className="text-white">{bestCatch.name}</strong> ({formatMoney(bestCatch.priceCents, "USD")})
                  </p>
                )}
                {/* Caught it in the game — here's where to catch it for real. */}
                {bestCatch?.slug && <MiniCompare cardIdOrSlug={bestCatch.slug} heading="Catch it for real — cheapest stores" />}
                <div className="flex flex-wrap justify-center gap-3">
                  <button onClick={start} className="btn-primary">↻ Play again</button>
                  <button onClick={share} className="btn-accent">{copied ? "✓ Copied!" : "Share score"}</button>
                  <Link href="/games" className="btn-ghost">More games</Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-600">
        Card values are live TCGplayer market guides — every run uses a fresh batch of real cards.
      </p>
    </div>
  );
}
