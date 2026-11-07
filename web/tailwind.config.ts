import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      spacing: {
        "18": "4.5rem",
        "90": "22.5rem",
      },
      colors: {
        background: "hsl(var(--background, 224 71% 4%))",
        foreground: "hsl(var(--foreground, 213 31% 91%))",
        card: {
          DEFAULT: "hsl(var(--card, 224 40% 10%))",
          foreground: "hsl(var(--card-foreground, 213 31% 91%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted, 223 47% 11%))",
          foreground: "hsl(var(--muted-foreground, 215.4 16.3% 56.9%))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary, 210 40% 98%))",
          foreground: "hsl(var(--primary-foreground, 222.2 47.4% 11.2%))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary, 222.2 47.4% 11.2%))",
          foreground: "hsl(var(--secondary-foreground, 210 40% 98%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive, 0 63% 31%))",
          foreground: "hsl(var(--destructive-foreground, 210 40% 98%))",
        },
        border: "hsl(var(--border, 216 34% 17%))",
        input: "hsl(var(--input, 216 34% 17%))",
        ring: "hsl(var(--ring, 216 34% 17%))",
        accent: {
          DEFAULT: "hsl(var(--accent, 216 34% 17%))",
          foreground: "hsl(var(--accent-foreground, 210 40% 98%))",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
