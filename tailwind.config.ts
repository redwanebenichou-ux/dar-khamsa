import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brown: "#21160F",       // البني الداكن الأساسي
        brownlight: "#3A2A1C",  // بني أفتح للفواصل
        gold: "#C99A45",        // الذهبي الأساسي
        lightgold: "#E7BD75",   // الذهبي الفاتح
        golddark: "#A87F35",    // ذهبي داكن للنصوص
        warmbeige: "#F5E7D7",   // بيج دافئ
        cream: "#FFF8EF",       // كريمي
        ink: "#21160F",
        ivory: "#FFF8EF",
        beige: "#F5E7D7",
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "system-ui", "sans-serif"],
        display: ["var(--font-amiri)", "serif"],
        numeric: ["var(--font-tajawal)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(33,22,15,.06), 0 8px 24px rgba(33,22,15,.08)",
        pop: "0 12px 40px rgba(33,22,15,.18)",
      },
    },
  },
  plugins: [],
};
export default config;
