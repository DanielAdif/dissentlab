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
        background:       "rgb(var(--bg) / <alpha-value>)",
        foreground:       "rgb(var(--text) / <alpha-value>)",
        surface:          "rgb(var(--surface) / <alpha-value>)",
        "surface-raised": "rgb(var(--surface-raised) / <alpha-value>)",
        border:           "rgb(var(--border) / <alpha-value>)",
        muted:            "rgb(var(--text-dim) / <alpha-value>)",
        // Backward-compat aliases — untouched components still compile
        card:             "rgb(var(--surface-raised) / <alpha-value>)",
        sidebar:          "rgb(var(--surface) / <alpha-value>)",
        checkpoint:       "rgb(var(--surface) / <alpha-value>)",
        accent:           "rgb(var(--text-dim) / <alpha-value>)",
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
