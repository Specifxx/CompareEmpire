"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";

// Bulk Breaker — breakout/Arkanoid where the bricks are REAL cards. Smash a
// brick to bank its live market value; chase cards (top value) are "holo"
// bricks that take two hits and glow. Power-ups drop: multi-ball, wide paddle,
// slow-mo. Clear the board to advance — each level deals a fresh batch of
// cards and speeds up. Same engine philosophy as Card Catcher: refs for the
// loop, React state only for overlays.

type GameCard = { id: string; name: string; slug: string | null; imageThumbUrl: string | null; rarity: string; priceCents: number };
type Brick = { card: GameCard; x: number; y: number; hp: number; holo: boolean; img: HTMLImageElement | null };
type Ball = { x: number; y: number; vx: number; vy: number; stuck: boolean };
type Drop = { kind: "multi" | "wide" | "slow"; x: number; y: number };
type Phase = "menu" | "playing" | "paused" | "over";

const W = 480, H = 640;
const BRICK_W = 64, BRICK_H = 88, COLS = 6, ROWS = 4;
const GRID_X = (W - COLS * (BRICK_W + 8) + 8) / 2;
const BEST_KEY = "dx_breaker_best";

export function BulkBreaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [finalScore, setFinalScore] = useState(0);
  const [finalLevel, setFinalLevel] = useState(1);
  const [bestBreak, setBestBreak] = useState<GameCard | null>(null);
  const [best, setBest] = useState(0);
  const [copied, setCopied] = useState(false);
  const phaseRef = useRef<Phase>("menu");
  phaseRef.current = phase;

  const eng = useRef({
    bricks: [] as Brick[],
    balls: [] as Ball[],
    drops: [] as Drop[],
    imgs: new Map<string, HTMLImageElement>(),
    paddleX: W / 2,
    paddleW: 92,
    wideUntil: 0,
    slowUntil: 0,
    score: 0,
    lives: 3,
    level: 1,
    bestBreak: null as GameCard | null,
    toasts: [] as { text: string; x: number; y: number; t: number; color: string }[],
    keys: { left: false, right: false },
  });

  useEffect(() => {
    try { setBest(parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0); } catch { /* ignore */ }
  }, []);

  async function dealBoard(level: number) {
    const e = eng.current;
    let cards: GameCard[] = [];
    try {
      const d = await fetch(`/api/games/cards?count=${COLS * ROWS}`).then((r) => r.json());
      cards = (d.cards ?? []).filter((c: GameCard) => c.imageThumbUrl);
    } catch { /* keep empty */ }
    if (cards.length < COLS * ROWS) return false;
    // Top ~25% by value become 2-hit holo bricks.
    const cut = [...cards].sort((a, b) => b.priceCents - a.priceCents)[Math.floor(cards.length / 4)]?.priceCents ?? Infinity;
    e.bricks = cards.slice(0, COLS * ROWS).map((card, i) => {
      const holo = card.priceCents >= cut && card.priceCents > 500;
      if (!e.imgs.has(card.id) && card.imageThumbUrl) {
        const img = new Image();
        img.src = card.imageThumbUrl;
        e.imgs.set(card.id, img);
      }
      return {
        card,
        x: GRID_X + (i % COLS) * (BRICK_W + 8),
        y: 64 + Math.floor(i / COLS) * (BRICK_H + 8),
        hp: holo ? 2 : 1,
        holo,
        img: e.imgs.get(card.id) ?? null,
      };
    });
    const speed = 240 + level * 28;
    e.balls = [{ x: W / 2, y: H - 90, vx: speed * 0.5, vy: -speed, stuck: true }];
    e.drops = [];
    return true;
  }

  async function start() {
    const e = eng.current;
    Object.assign(e, { score: 0, lives: 3, level: 1, bestBreak: null, toasts: [], wideUntil: 0, slowUntil: 0, paddleW: 92 });
    if (!(await dealBoard(1))) return;
    setPhase("playing");
  }

  function gameOver() {
    const e = eng.current;
    setFinalScore(e.score);
    setFinalLevel(e.level);
    setBestBreak(e.bestBreak);
    setBest((b) => {
      const nb = Math.max(b, e.score);
      try { localStorage.setItem(BEST_KEY, String(nb)); } catch { /* full */ }
      return nb;
    });
    setPhase("over");
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const e = eng.current;

    const onKey = (down: boolean) => (ev: KeyboardEvent) => {
      if (ev.key === "ArrowLeft" || ev.key === "a") e.keys.left = down;
      if (ev.key === "ArrowRight" || ev.key === "d") e.keys.right = down;
      if (down && ev.key === " ") e.balls.forEach((b) => (b.stuck = false));
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
    const onDown = (ev: PointerEvent) => {
      if (phaseRef.current === "playing") { e.paddleX = toX(ev.clientX); e.balls.forEach((b) => (b.stuck = false)); }
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);

    let last = performance.now();
    let raf = 0;
    let advancing = false;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;

      ctx.fillStyle = "#0e1116";
      ctx.fillRect(0, 0, W, H);

      if (phaseRef.current !== "playing") return;

      const slow = now < e.slowUntil ? 0.55 : 1;
      e.paddleW = now < e.wideUntil ? 140 : 92;

      // Paddle.
      const pv = 460 * dt;
      if (e.keys.left) e.paddleX -= pv;
      if (e.keys.right) e.paddleX += pv;
      e.paddleX = Math.max(e.paddleW / 2, Math.min(W - e.paddleW / 2, e.paddleX));
      const paddleY = H - 36;

      // Balls.
      for (let bi = e.balls.length - 1; bi >= 0; bi--) {
        const b = e.balls[bi];
        if (b.stuck) {
          b.x = e.paddleX;
          b.y = paddleY - 10;
        } else {
          b.x += b.vx * dt * slow;
          b.y += b.vy * dt * slow;
          if (b.x < 7) { b.x = 7; b.vx = Math.abs(b.vx); }
          if (b.x > W - 7) { b.x = W - 7; b.vx = -Math.abs(b.vx); }
          if (b.y < 7) { b.y = 7; b.vy = Math.abs(b.vy); }
          // Paddle bounce with english (hit position steers the ball).
          if (b.vy > 0 && b.y >= paddleY - 8 && b.y <= paddleY + 10 && Math.abs(b.x - e.paddleX) <= e.paddleW / 2 + 6) {
            const off = (b.x - e.paddleX) / (e.paddleW / 2);
            const sp = Math.hypot(b.vx, b.vy);
            const ang = off * 1.05; // radians off vertical
            b.vx = sp * Math.sin(ang);
            b.vy = -Math.abs(sp * Math.cos(ang));
          }
          // Lost ball.
          if (b.y > H + 12) {
            e.balls.splice(bi, 1);
            if (!e.balls.length) {
              e.lives -= 1;
              if (e.lives <= 0) { gameOver(); return; }
              e.toasts.push({ text: "💔 ball lost", x: W / 2, y: H / 2, t: 1, color: "#f87171" });
              e.balls = [{ x: e.paddleX, y: paddleY - 10, vx: 180, vy: -300, stuck: true }];
            }
            continue;
          }
        }

        // Brick collisions (AABB vs ball point + radius, axis pick by overlap).
        for (let i = e.bricks.length - 1; i >= 0; i--) {
          const br = e.bricks[i];
          if (b.x + 7 < br.x || b.x - 7 > br.x + BRICK_W || b.y + 7 < br.y || b.y - 7 > br.y + BRICK_H) continue;
          const ox = Math.min(b.x + 7 - br.x, br.x + BRICK_W - (b.x - 7));
          const oy = Math.min(b.y + 7 - br.y, br.y + BRICK_H - (b.y - 7));
          if (ox < oy) b.vx = b.x < br.x + BRICK_W / 2 ? -Math.abs(b.vx) : Math.abs(b.vx);
          else b.vy = b.y < br.y + BRICK_H / 2 ? -Math.abs(b.vy) : Math.abs(b.vy);
          br.hp -= 1;
          if (br.hp <= 0) {
            e.bricks.splice(i, 1);
            e.score += br.card.priceCents;
            if (!e.bestBreak || br.card.priceCents > e.bestBreak.priceCents) e.bestBreak = br.card;
            e.toasts.push({ text: `+${formatMoney(br.card.priceCents, "USD")}`, x: br.x + BRICK_W / 2, y: br.y + BRICK_H / 2, t: 0.8, color: br.holo ? "#ffd23f" : "#34d399" });
            // ~18% of broken bricks drop a power-up.
            if (Math.random() < 0.18) {
              const kinds = ["multi", "wide", "slow"] as const;
              e.drops.push({ kind: kinds[Math.floor(Math.random() * kinds.length)], x: br.x + BRICK_W / 2, y: br.y + BRICK_H / 2 });
            }
          } else {
            e.toasts.push({ text: "✨ holo!", x: br.x + BRICK_W / 2, y: br.y, t: 0.6, color: "#a78bfa" });
          }
          break; // one brick per ball per frame keeps physics stable
        }
      }

      // Cleared the board → next level.
      if (!e.bricks.length && !advancing) {
        advancing = true;
        e.level += 1;
        e.toasts.push({ text: `LEVEL ${e.level}!`, x: W / 2, y: H / 2, t: 1.4, color: "#ffcb05" });
        dealBoard(e.level).then((ok) => {
          advancing = false;
          if (!ok) gameOver();
        });
      }

      // Power-up drops.
      for (let i = e.drops.length - 1; i >= 0; i--) {
        const d = e.drops[i];
        d.y += 150 * dt;
        if (d.y > H + 12) { e.drops.splice(i, 1); continue; }
        if (d.y >= paddleY - 6 && Math.abs(d.x - e.paddleX) < e.paddleW / 2 + 10) {
          e.drops.splice(i, 1);
          if (d.kind === "multi") {
            const src = e.balls[0];
            if (src) {
              const sp = Math.hypot(src.vx, src.vy);
              e.balls.push({ x: src.x, y: src.y, vx: sp * 0.6, vy: -sp * 0.8, stuck: false });
              e.balls.push({ x: src.x, y: src.y, vx: -sp * 0.6, vy: -sp * 0.8, stuck: false });
            }
            e.toasts.push({ text: "MULTI-BALL!", x: d.x, y: paddleY - 16, t: 0.9, color: "#60a5fa" });
          } else if (d.kind === "wide") {
            e.wideUntil = now + 9000;
            e.toasts.push({ text: "WIDE PADDLE!", x: d.x, y: paddleY - 16, t: 0.9, color: "#34d399" });
          } else {
            e.slowUntil = now + 6000;
            e.toasts.push({ text: "SLOW-MO!", x: d.x, y: paddleY - 16, t: 0.9, color: "#a78bfa" });
          }
          continue;
        }
        ctx.font = "22px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(d.kind === "multi" ? "🔮" : d.kind === "wide" ? "📏" : "🎱", d.x, d.y);
      }

      // Draw bricks.
      for (const br of e.bricks) {
        ctx.save();
        if (br.holo) { ctx.shadowColor = br.hp === 2 ? "#ffd23f" : "#a78bfa"; ctx.shadowBlur = 10; }
        if (br.img?.complete && br.img.naturalWidth) ctx.drawImage(br.img, br.x, br.y, BRICK_W, BRICK_H);
        else { ctx.fillStyle = "#252b38"; ctx.fillRect(br.x, br.y, BRICK_W, BRICK_H); }
        if (br.holo && br.hp === 2) {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "#ffd23f";
          ctx.lineWidth = 2;
          ctx.strokeRect(br.x + 1, br.y + 1, BRICK_W - 2, BRICK_H - 2);
        }
        ctx.restore();
      }

      // Draw paddle + balls.
      ctx.fillStyle = "#ee1515";
      ctx.beginPath();
      ctx.roundRect(e.paddleX - e.paddleW / 2, paddleY, e.paddleW, 14, 7);
      ctx.fill();
      for (const b of e.balls) {
        ctx.fillStyle = "#ffcb05";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
        ctx.fill();
        if (b.stuck) {
          ctx.fillStyle = "#94a3b8";
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("tap / space to launch", b.x, b.y - 18);
        }
      }

      // Toasts.
      for (let i = e.toasts.length - 1; i >= 0; i--) {
        const t = e.toasts[i];
        t.t -= dt;
        t.y -= 26 * dt;
        if (t.t <= 0) { e.toasts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(1, t.t * 2);
        ctx.fillStyle = t.color;
        ctx.font = t.text.startsWith("LEVEL") ? "bold 30px sans-serif" : "bold 14px sans-serif";
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
      ctx.fillText(`LV ${e.level} · ${e.bricks.length} cards left`, 12, 44);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function share() {
    const text = `Bulk Breaker 🧱 I smashed ${formatMoney(finalScore, "USD")} worth of Pokémon cards (level ${finalLevel})!\nBeat that: dexcompare.app/games/breaker`;
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white">🧱 Bulk Breaker</h1>
          <p className="mt-1 text-sm text-slate-400">
            Breakout, but the bricks are real cards — smash them to bank their market value.
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
                <div className="text-5xl">🧱</div>
                <h2 className="text-xl font-extrabold text-white">Smash the bulk</h2>
                <p className="max-w-xs text-sm text-slate-400">
                  Move with <strong className="text-white">mouse / touch / ← →</strong>, tap or space to
                  launch. Gold-ringed holo cards take two hits. Catch 🔮 multi-ball, 📏 wide paddle and 🎱
                  slow-mo. Clear the board to level up!
                </p>
                <button onClick={start} className="btn-primary text-base">▶ Start breaking</button>
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
                <h2 className="animate-pop text-2xl font-extrabold text-white">Out of balls!</h2>
                <div className="text-3xl font-extrabold text-gold">{formatMoney(finalScore, "USD")}</div>
                <p className="text-xs text-slate-400">smashed across {finalLevel} {finalLevel === 1 ? "level" : "levels"} · best: {formatMoney(best, "USD")}</p>
                {bestBreak && (
                  <p className="text-sm text-slate-300">
                    Biggest break: <strong className="text-white">{bestBreak.name}</strong> ({formatMoney(bestBreak.priceCents, "USD")}){" "}
                    {bestBreak.slug && (
                      <Link href={`/card/${bestBreak.slug}`} className="text-brand-400 hover:underline">live prices →</Link>
                    )}
                  </p>
                )}
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
        Don&apos;t worry — no real cards were harmed. Values are live TCGplayer market guides.
      </p>
    </div>
  );
}
