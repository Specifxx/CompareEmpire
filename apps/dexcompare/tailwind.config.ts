import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Clean, low-saturation dark palette (CSFloat-style): near-black surfaces,
        // cool grey borders, restrained accents — no neon.
        ink: {
          950: "#0a0c10",
          900: "#0e1116",
          850: "#13171f",
          800: "#191e28",
          700: "#252b38",
          600: "#333b4d",
        },
        // Pokémon-inspired: bold Poké Ball red accent + electric yellow for prices.
        brand: {
          DEFAULT: "#ee1515",
          400: "#ff4d4d",
          500: "#ee1515",
          600: "#c20d0d",
        },
        accent: "#ffcb05", // electric yellow — prices & highlights
        gold: "#ffd23f",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Soft elevation + a gentle brand glow for the bubbly look.
        card: "0 1px 0 rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.35)",
        // Stronger, layered elevation for the refreshed card surface.
        "card-lg": "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.2), 0 16px 40px rgba(0,0,0,0.45)",
        glow: "0 0 0 1px rgba(238,21,21,0.25), 0 10px 30px rgba(255,203,5,0.18)",
        "glow-lg": "0 0 0 1px rgba(238,21,21,0.35), 0 16px 48px rgba(255,203,5,0.22)",
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
