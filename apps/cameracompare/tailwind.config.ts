import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light, professional retail palette (Kogan/JB-style): white surfaces, cool
        // slate text + borders, a confident blue primary. The legacy `ink` scale is
        // remapped to light neutrals so any stray class still renders on-theme.
        ink: {
          950: "#ffffff",
          900: "#ffffff",
          850: "#f8fafc",
          800: "#f1f5f9",
          700: "#e2e8f0",
          600: "#cbd5e1",
        },
        // Primary brand = blue (buttons, links, active states).
        brand: {
          DEFAULT: "#2563eb",
          300: "#3b82f6",
          400: "#2563eb",
          500: "#2563eb",
          600: "#1d4ed8",
        },
        accent: "#2563eb", // blue — links & highlights
        gold: "#16a34a", // green — savings / in-stock badges
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Soft, neutral elevation for a clean retail card look.
        card: "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)",
        glow: "0 1px 2px rgba(37,99,235,0.10), 0 6px 18px rgba(37,99,235,0.12)",
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
