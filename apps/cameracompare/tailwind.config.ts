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
        // Photography vibe: amber "shutter" accent over cool slate surfaces.
        brand: {
          DEFAULT: "#f59e0b",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        accent: "#fbbf24", // amber — prices & highlights
        gold: "#ffc24d",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Soft elevation + a gentle brand glow for the bubbly look.
        card: "0 1px 0 rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.35)",
        glow: "0 0 0 1px rgba(245,158,11,0.25), 0 10px 30px rgba(245,158,11,0.16)",
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
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
