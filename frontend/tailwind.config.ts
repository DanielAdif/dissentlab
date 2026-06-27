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
        background:       "rgb(var(--bg) / <alpha-value>)",
        foreground:       "rgb(var(--text) / <alpha-value>)",
        surface:          "rgb(var(--surface) / <alpha-value>)",
        "surface-raised": "rgb(var(--surface-raised) / <alpha-value>)",
        border:           "rgb(var(--border) / <alpha-value>)",
        muted:            "rgb(var(--text-dim) / <alpha-value>)",
        accent:           "rgb(var(--accent) / <alpha-value>)",
        // Backward-compat aliases
        card:             "rgb(var(--surface-raised) / <alpha-value>)",
        sidebar:          "rgb(var(--surface) / <alpha-value>)",
        checkpoint:       "rgb(var(--surface) / <alpha-value>)",
        // Persona voice colors — design palette
        "stripe-optimist":   "#4E7A5F",
        "stripe-pessimist":  "#8B4F4F",
        "stripe-contrarian": "#4F6B8B",
        "stripe-observer":   "#7B5C3A",
      },
      fontFamily: {
        sans:  ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        mono:  ["JetBrains Mono", "monospace"],
      },
      animation: {
        "msg-in":     "msgIn 0.38s ease both",
        "verdict-in": "verdictIn 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "home-in":    "homeIn 0.55s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
