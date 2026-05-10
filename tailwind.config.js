/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#fdf6e3", // Light text for dark background
        mist: "#261a12", // Dark brown background, brighter than before
        gold: {
          50: "#fffbe6",
          100: "#fff1b8",
          200: "#ffe58f",
          300: "#ffd666",
          400: "#ffc53d",
          500: "#faad14",
          600: "#d48806",
          700: "#ad6800",
          800: "#874d00",
          900: "#613400",
        },
        guard: {
          green: "#d48806", // Replaced with gold
          blue: "#ffd666",  // Replaced with light gold
          cyan: "#faad14",  // Replaced with gold
          yellow: "#d48806",
          orange: "#ad6800",
          red: "#874d00",
        },
        dark: {
          card: "rgba(55, 38, 26, 0.7)",
          bg: "#1c140e",
        }
      },
      boxShadow: {
        card: "0 0 20px rgba(212, 136, 6, 0.2)",
        soft: "0 0 10px rgba(250, 173, 20, 0.15)",
        gold: "0 0 15px rgba(250, 173, 20, 0.3)",
      },
      fontFamily: {
        sans: [
          "'KaiTi'",
          "'STKaiti'",
          "'Songti SC'",
          "'Microsoft YaHei'",
          "serif",
        ],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #faad14 0%, #d48806 100%)',
        'dark-gradient': 'radial-gradient(circle at center, #442a1a 0%, #1c140e 100%)',
      }
    },
  },
  plugins: [],
};
