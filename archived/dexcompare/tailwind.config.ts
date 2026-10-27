import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Market-terminal palette: near-neutral graphite surfaces, cool grey
        // hairline borders, ONE sharp accent (Poké red), used sparingly. No neon.
        ink: {
          950: "#0a0c10",
          900: "#0e1116",
          850: "#13171f",
          800: "#191e28",
          700: "#252b38",
          600: "#333b4d",
        },
        // The single sharp accent — Poké-Ball red, reserved for primary actions
        // and the active state. Everything else stays neutral.
        brand: {
          DEFAULT: "#ee1515",
          400: "#ff4d4d",
          500: "#ee1515",
          600: "#c20d0d",
        },
        // "accent" now reads as the high-contrast NUMERAL colour — a near-white
        // ink for prices, so figures stay crisp and neutral like a trading desk.
        // (Repointed from electric yellow → neutral; kills the neon-price tell
        // site-wide wherever `text-accent` was used for a price.)
        accent: "#eef1f5",
        // Muted brass — reserved for genuine "gold"/foil semantics only, never UI chrome.
        gold: "#caa85a",
        // Market deltas: gains/losses on the terminal. Calm, not neon.
        up: "#3fb950",
        down: "#f0506e",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Monospace — prices, tickers, tabular figures (the terminal voice).
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        // Flat panels: a hairline top highlight + a quiet drop. No coloured glow.
        card: "0 1px 0 rgba(255,255,255,0.02), 0 1px 2px rgba(0,0,0,0.4)",
        "card-lg": "0 1px 0 rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.4)",
        // Kept for API compatibility, but neutralised to a quiet elevation —
        // any lingering `shadow-glow` references no longer emit neon.
        glow: "0 1px 0 rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.45)",
        "glow-lg": "0 2px 0 rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.5)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        // Slow drifting aurora gradient for the hero background.
        aurora: {
          "0%,100%": { transform: "translate3d(-6%,-4%,0) scale(1.05)", opacity: "0.55" },
          "33%": { transform: "translate3d(4%,2%,0) scale(1.15)", opacity: "0.75" },
          "66%": { transform: "translate3d(2%,-3%,0) scale(1.1)", opacity: "0.6" },
        },
        // Panning gradient for animated text / borders.
        "gradient-pan": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        // Skeleton shimmer sweep.
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        // Gentle pulse for "live" dots.
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(52,211,153,0.5)" },
          "70%,100%": { boxShadow: "0 0 0 6px rgba(52,211,153,0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        float: "float 4s ease-in-out infinite",
        aurora: "aurora 18s ease-in-out infinite",
        "gradient-pan": "gradient-pan 6s ease infinite",
        shimmer: "shimmer 1.6s infinite",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
