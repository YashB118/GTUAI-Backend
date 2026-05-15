import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // All colors reference CSS variables — light is default, dark via .dark class
        bg: {
          page:     "rgb(var(--c-bg-page)     / <alpha-value>)",
          primary:  "rgb(var(--c-bg-primary)  / <alpha-value>)", // alias for page (back-compat)
          card:     "rgb(var(--c-bg-card)     / <alpha-value>)",
          elevated: "rgb(var(--c-bg-elevated) / <alpha-value>)",
          muted:    "rgb(var(--c-bg-muted)    / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--c-border)     / <alpha-value>)",
          strong:  "rgb(var(--c-border-strong) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--c-accent)       / <alpha-value>)",
          hover:   "rgb(var(--c-accent-hover) / <alpha-value>)",
          glow:    "rgb(var(--c-accent) / 0.15)",
          subtle:  "rgb(var(--c-accent) / 0.08)",
        },
        text: {
          primary:   "rgb(var(--c-text-primary)   / <alpha-value>)",
          secondary: "rgb(var(--c-text-secondary) / <alpha-value>)",
          muted:     "rgb(var(--c-text-muted)     / <alpha-value>)",
          tertiary:  "rgb(var(--c-text-muted)     / 0.7)",
        },
        status: {
          success: "rgb(16 185 129 / <alpha-value>)",
          info:    "rgb(59 130 246 / <alpha-value>)",
          warn:    "rgb(245 158 11 / <alpha-value>)",
          error:   "rgb(239 68 68  / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs:    ["12px", { lineHeight: "1.55", letterSpacing: "-0.005em" }],
        sm:    ["13px", { lineHeight: "1.6",  letterSpacing: "-0.005em" }],
        base:  ["14px", { lineHeight: "1.65", letterSpacing: "-0.005em" }],
        lg:    ["16px", { lineHeight: "1.55", letterSpacing: "-0.01em"  }],
        xl:    ["18px", { lineHeight: "1.45", letterSpacing: "-0.012em" }],
        "2xl": ["22px", { lineHeight: "1.35", letterSpacing: "-0.015em" }],
        "3xl": ["28px", { lineHeight: "1.25", letterSpacing: "-0.02em"  }],
        "4xl": ["36px", { lineHeight: "1.15", letterSpacing: "-0.025em" }],
        "5xl": ["48px", { lineHeight: "1.05", letterSpacing: "-0.03em"  }],
        "6xl": ["64px", { lineHeight: "1.0",  letterSpacing: "-0.035em" }],
        "7xl": ["80px", { lineHeight: "0.95", letterSpacing: "-0.04em"  }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter:  "-0.03em",
      },
      borderRadius: {
        "3xl": "24px",
        "2xl": "20px",
        xl:    "16px",
        lg:    "12px",
        md:    "10px",
        sm:    "8px",
      },
      boxShadow: {
        // Light, modern shadows — replace heavy borders
        card:        "0 1px 2px rgba(15,23,42,0.04), 0 2px 6px rgba(15,23,42,0.04)",
        "card-hover":"0 2px 6px rgba(15,23,42,0.06), 0 8px 20px rgba(15,23,42,0.08)",
        soft:        "0 1px 2px rgba(15,23,42,0.04)",
        elevated:    "0 4px 12px rgba(15,23,42,0.06), 0 12px 24px rgba(15,23,42,0.08)",
        modal:       "0 24px 60px rgba(15,23,42,0.18), 0 0 0 1px rgb(var(--c-border)/0.6)",
        menu:        "0 8px 24px rgba(15,23,42,0.10), 0 0 0 1px rgb(var(--c-border)/0.7)",
        accent:      "0 0 24px rgb(var(--c-accent)/0.18)",
        "accent-glow":"0 0 0 4px rgb(var(--c-accent)/0.12)",
        // Inset for inputs
        "input-focus":"inset 0 0 0 1px rgb(var(--c-accent) / 0.45)",
      },
      backgroundImage: {
        "hero-grad":   "radial-gradient(120% 80% at 50% 0%, rgb(var(--c-accent) / 0.08), transparent 60%)",
        "card-grad":   "linear-gradient(180deg, rgb(var(--c-text-primary) / 0.015), transparent 100%)",
        "noise":       "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4' /%3E%3C/svg%3E\")",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        shimmer:   "shimmer 1.6s infinite linear",
        "fade-in": "fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up":"slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in":"scale-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      spacing: {
        "4.5": "18px",
        "5.5": "22px",
        "7.5": "30px",
        "13":  "52px",
        "15":  "60px",
        "17":  "68px",
      },
      maxWidth: {
        "8xl": "88rem",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
