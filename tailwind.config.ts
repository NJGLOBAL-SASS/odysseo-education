import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        noir: "#0B0B0D",
        rouge: {
          DEFAULT: "#FF0000",
          fonce: "#D60000",
        },
        fond: "#F4F4F6",
        carte: "#FFFFFF",
        texte: "#0B0B0D",
        gris: "#5B5B66",
        bord: "#D9D9DE",
        erreur: {
          DEFAULT: "#D60000",
          fond: "#FFF1F1",
        },
        ok: "#0F7B3F",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        brand: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,11,13,.04), 0 0 0 1px rgba(11,11,13,.05)",
        pop: "0 12px 32px -8px rgba(11,11,13,.18), 0 0 0 1px rgba(11,11,13,.06)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(.98)" },
          to: { opacity: "1", transform: "none" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "toast-in": "toast-in .2s ease-out",
        "fade-up": "fade-up .25s ease-out both",
      },
      maxWidth: {
        wrap: "560px",
        site: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
