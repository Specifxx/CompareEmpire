import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Same low-saturation dark system as the sister sites (shared design
        // language across the empire), with an imperial purple + gold identity.
        ink: {
          950: "#0a0c10",
          900: "#0e1116",
          850: "#13171f",
          800: "#191e28",
          700: "#252b38",
          600: "#333b4d",
        },
        // TCGPriceEmpire: imperial purple accent + gold for prices/highlights.
        brand: {
          DEFAULT: "#8b5cf6",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        accent: "#fbbf24", // imperial gold — prices & highlights
        gold: "#fcd34d",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.35)",
        glow: "0 0 0 1px rgba(139,92,246,0.25), 0 10px 30px rgba(251,191,36,0.15)",
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
        // Drifting hero cards: slow vertical bob + slight tilt, varied per card
        // via inline animation-delay/duration.
        drift: {
          "0%,100%": { transform: "translateY(0) rotate(var(--tilt, -3deg))" },
          "50%": { transform: "translateY(-10px) rotate(var(--tilt, -3deg))" },
        },
        // Infinite ticker: content is duplicated once, so -50% loops seamlessly.
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // Slowly panning hero gradient (background-size 200% makes it visible).
        "gradient-pan": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-glow": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(139,92,246,0.0)" },
          "50%": { boxShadow: "0 0 24px 2px rgba(139,92,246,0.35)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        float: "float 4s ease-in-out infinite",
        drift: "drift 7s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        "gradient-pan": "gradient-pan 14s ease infinite",
        "pulse-glow": "pulse-glow 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
