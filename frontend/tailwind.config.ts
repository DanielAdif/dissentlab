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
        background: "#0a0a0a",
        foreground: "#f5f5f5",
        card: "#141414",
        border: "#262626",
        muted: "#737373",
        sidebar: "#111111",
        accent: "#d4d4d4",
        checkpoint: "#1f1f1f",
        optimist: "#4a4a4a",
        pessimist: "#616161",
        contrarian: "#787878",
        observer: "#4f4f4f",
        "bubble-1": "#181818",
        "bubble-2": "#1e1e1e",
        "bubble-3": "#232323",
        "bubble-4": "#282828",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
