import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary token names (new)
        background:       "var(--bg)",
        foreground:       "var(--text)",
        surface:          "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        border:           "var(--border)",
        muted:            "var(--text-dim)",
        // Backward-compat aliases — untouched components still compile
        card:             "var(--surface-raised)",
        sidebar:          "var(--surface)",
        checkpoint:       "var(--surface)",
        accent:           "var(--text-dim)",
        // Persona voice stripes — fixed warm-gray values, same in both modes
        "stripe-optimist":   "#9b8f82",
        "stripe-pessimist":  "#5f5550",
        "stripe-contrarian": "#b5a99b",
        "stripe-observer":   "#c8bdb0",
      },
      fontFamily: {
        sans:  ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
        mono:  ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
