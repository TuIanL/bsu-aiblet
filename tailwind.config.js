/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        mist: "#f5f9fb",
        guard: {
          green: "#16a163",
          blue: "#1f7ae0",
          cyan: "#11a7b7",
          yellow: "#d99b12",
          orange: "#ef7d24",
          red: "#dd3b3b",
        },
      },
      boxShadow: {
        card: "0 18px 48px rgba(29, 91, 126, 0.12)",
        soft: "0 10px 30px rgba(31, 122, 224, 0.10)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
