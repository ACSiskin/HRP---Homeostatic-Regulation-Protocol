import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      borderRadius: {
        // zachowujemy shadcn + dodajemy większy radius pod "glass tiles"
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl2: "1rem",
      },
      colors: {
        // shadcn tokens (zostają)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },

        // >>> DODANE: paleta jak w pierwszym projekcie (neon / dashboard)
        bg: {
          950: "#05070d",
          900: "#0b1020",
          800: "#10182b",
        },
        cyan: {
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
        },
        amber: {
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
        },
        crimson: {
          400: "#fb7185",
          500: "#f43f5e",
          600: "#e11d48",
        },
        glass: {
          100: "rgba(255,255,255,0.04)",
          200: "rgba(255,255,255,0.06)",
          300: "rgba(255,255,255,0.10)",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,211,238,.18), 0 0 24px rgba(34,211,238,.12)",
        "glow-amber":
          "0 0 0 1px rgba(251,191,36,.18), 0 0 24px rgba(251,191,36,.12)",
        "glow-crimson":
          "0 0 0 1px rgba(244,63,94,.18), 0 0 24px rgba(244,63,94,.12)",
      },
      backgroundImage: {
        // opcjonalne utility klasy, jeśli chcesz używać w komponentach
        "dashboard-grid":
          "linear-gradient(to right, rgba(148,163,184,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,.08) 1px, transparent 1px)",
      },
      backgroundSize: {
        "dashboard-grid": "28px 28px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
