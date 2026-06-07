import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070810",
          900: "#0b0d18",
          850: "#10131f",
          800: "#161a29",
          700: "#222740",
          600: "#333a5c",
        },
        // Imperial indigo + gold.
        brand: { DEFAULT: "#6366f1", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5" },
        gold: "#f4c84a",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04), 0 12px 40px rgba(0,0,0,0.45)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(14px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: { "fade-up": "fade-up 0.6s ease-out both" },
    },
  },
  plugins: [],
};
export default config;
