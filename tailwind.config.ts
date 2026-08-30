import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          900: "var(--forest-900)",
          800: "var(--forest-800)",
          700: "var(--forest-700)",
        },
        parchment: {
          50: "var(--parchment-50)",
          100: "var(--parchment-100)",
          200: "var(--parchment-200)",
        },
        gold: {
          500: "var(--gold-500)",
          600: "var(--gold-600)",
        },
        clay: {
          600: "var(--clay-600)",
        },
        ink: {
          900: "var(--ink-900)",
          500: "var(--ink-500)",
          300: "var(--ink-300)",
        },
        line: "var(--line)",
        danger: "var(--danger)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
