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
        card: "0 1px 2px rgba(0,0,0,.05)",
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
