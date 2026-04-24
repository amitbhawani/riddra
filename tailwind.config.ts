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
        ink: "#0a1020",
        aurora: "#5ae6c6",
        flare: "#f4b860",
        bloom: "#f76c5e",
        mist: "#d8e2f2",
      },
      boxShadow: {
        glow: "0 20px 80px rgba(90, 230, 198, 0.15)",
      },
      backgroundImage: {
        grid:
          "linear-gradient(to right, rgba(216,226,242,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(216,226,242,0.08) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
