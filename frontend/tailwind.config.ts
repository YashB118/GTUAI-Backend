import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // All colors reference CSS variables so they auto-update in light/dark mode.
        // <alpha-value> is replaced by Tailwind when using opacity modifiers (bg-accent/10 etc.)
        bg: {
          primary:  "rgb(var(--c-bg-primary)  / <alpha-value>)",
          card:     "rgb(var(--c-bg-card)     / <alpha-value>)",
          elevated: "rgb(var(--c-bg-elevated) / <alpha-value>)",
        },
        border: "rgb(var(--c-border) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--c-accent)       / <alpha-value>)",
          hover:   "rgb(var(--c-accent-hover) / <alpha-value>)",
          glow:    "rgb(var(--c-accent) / 0.15)",
          subtle:  "rgb(var(--c-accent) / 0.06)",
        },
        text: {
          primary:   "rgb(var(--c-text-primary)   / <alpha-value>)",
          secondary: "rgb(var(--c-text-secondary) / <alpha-value>)",
          muted:     "rgb(var(--c-text-muted)     / <alpha-value>)",
          tertiary:  "rgb(var(--c-text-muted)     / 0.7)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        // Scale up Tailwind defaults by ~1–2px for better readability
        xs:   ["13px", { lineHeight: "1.5"  }],  // was 12px
        sm:   ["15px", { lineHeight: "1.6"  }],  // was 14px
        base: ["16px", { lineHeight: "1.7"  }],  // unchanged
        lg:   ["18px", { lineHeight: "1.55" }],  // was 18px (same, keep)
        xl:   ["20px", { lineHeight: "1.4"  }],
        "2xl":["24px", { lineHeight: "1.35" }],
        "3xl":["30px", { lineHeight: "1.25" }],
        "4xl":["36px", { lineHeight: "1.15" }],
        "5xl":["48px", { lineHeight: "1.1"  }],
        "6xl":["60px", { lineHeight: "1.05" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter:  "-0.03em",
      },
      backgroundImage: {
        "hero-gradient":    "linear-gradient(145deg, rgb(var(--c-accent) / 0.09) 0%, transparent 60%)",
        "card-gradient":    "linear-gradient(145deg, rgb(var(--c-accent) / 0.04), transparent)",
        "surface-gradient": "linear-gradient(180deg, rgb(var(--c-text-primary) / 0.03) 0%, transparent 100%)",
      },
      borderRadius: {
        "2xl": "16px",
        xl:    "12px",
        lg:    "10px",
        md:    "8px",
        sm:    "6px",
      },
      boxShadow: {
        card:       "0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.04)",
        "card-hover":"0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgb(var(--c-accent)/0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
        accent:     "0 0 24px rgb(var(--c-accent)/0.15)",
        "accent-glow":"0 0 0 3px rgb(var(--c-accent)/0.15)",
        glass:      "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        modal:      "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgb(var(--c-border)/0.5)",
        menu:       "0 8px 32px rgba(0,0,0,0.22), 0 0 0 1px rgb(var(--c-border)/0.8)",
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
          "0%":   { opacity: "0", transform: "translateY(10px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "blur-in": {
          "0%":   { opacity: "0", filter: "blur(4px)" },
          "100%": { opacity: "1", filter: "blur(0)" },
        },
      },
      animation: {
        shimmer:   "shimmer 1.8s infinite linear",
        "fade-in": "fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up":"slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in":"scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "blur-in": "blur-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
