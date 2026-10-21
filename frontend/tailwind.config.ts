import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#0b0d0c",
        cream: "#eef3f0",
        ink: "#e8eee9",
        mute: "#8d9891",
        line: "#24302a",
        surface: "#141917",
        pitch: "#101412",
        "pitch-dark": "#070908",
        fire: "#22c55e",
        "fire-dark": "#16a34a",
        won: "#4ade80",
        lost: "#fb7185",
        star: "#a3e635",
        tg: "#2aa3d4",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-display)", "Impact", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        slip: "0 18px 50px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
