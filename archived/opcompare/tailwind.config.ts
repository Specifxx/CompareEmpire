import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark base surfaces (kept for contrast against the vibrant accents).
        ink: {
          950: "#0a0c10",
          900: "#0e1116",
          850: "#13171f",
          800: "#191e28",
          700: "#252b38",
          600: "#333b4d",
        },
        // One Piece palette — straw-hat orange, sunrise gold, Luffy red and the
        // blues of the Grand Line ocean. Vibrant, high-energy.
        brand: {
          DEFAULT: "#f97316",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
        },
        accent: "#fde047", // straw-hat gold
        gold: "#ffd23f",
        luffy: { DEFAULT: "#ef4444", 400: "#f87171", 500: "#ef4444", 600: "#dc2626" },
        ocean: { 300: "#7dd3fc", 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 900: "#0c4a6e" },
        sunset: "#fb7185",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.35)",
        glow: "0 0 0 1px rgba(249,115,22,0.25), 0 10px 30px rgba(253,224,71,0.18)",
        // Bright treasure glow for the hero CTA.
        treasure: "0 0 24px rgba(253,224,71,0.45), 0 0 48px rgba(249,115,22,0.25)",
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
        // Bigger, slower bob for floating hero props.
        bob: {
          "0%,100%": { transform: "translateY(0) rotate(-3deg)" },
          "50%": { transform: "translateY(-16px) rotate(3deg)" },
        },
        "bob-slow": {
          "0%,100%": { transform: "translateY(0) rotate(2deg)" },
          "50%": { transform: "translateY(-22px) rotate(-2deg)" },
        },
        // Pan a multi-stop gradient back and forth for the living "Grand Line sky".
        "gradient-pan": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        // Horizontal drift for the ocean wave layers.
        wave: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // Soft pulsing halo for the logo / treasure CTA.
        "pulse-glow": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(253,224,71,0.0)", filter: "drop-shadow(0 0 6px rgba(253,224,71,0.5))" },
          "50%": { boxShadow: "0 0 0 0 rgba(253,224,71,0.0)", filter: "drop-shadow(0 0 18px rgba(249,115,22,0.85))" },
        },
        // Sheen sweeping across the headline gradient text.
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        float: "float 4s ease-in-out infinite",
        bob: "bob 6s ease-in-out infinite",
        "bob-slow": "bob-slow 9s ease-in-out infinite",
        "gradient-pan": "gradient-pan 12s ease-in-out infinite",
        wave: "wave 12s linear infinite",
        "wave-slow": "wave 20s linear infinite",
        "pulse-glow": "pulse-glow 3.5s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
