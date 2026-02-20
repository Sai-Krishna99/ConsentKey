import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#151b2f",
        line: "#2a3455",
        surface: "#1c2541"
      },
      boxShadow: {
        frame: "0 26px 60px rgba(0, 0, 0, 0.45)"
      },
      keyframes: {
        inhale: {
          "0%, 100%": { opacity: "0.4", transform: "scaleY(0.9)" },
          "50%": { opacity: "1", transform: "scaleY(1.06)" }
        }
      },
      animation: {
        inhale: "inhale 1.25s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
