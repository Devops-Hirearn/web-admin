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
        primary: {
          DEFAULT: "#007AFF",
          dark: "#0051D5",
          light: "#4DA3FF",
        },
        secondary: {
          DEFAULT: "#6C757D",
          dark: "#495057",
          light: "#ADB5BD",
        },
        success: "#28A745",
        danger: "#DC3545",
        warning: "#FFC107",
        info: "#17A2B8",
      },
    },
  },
  plugins: [],
};
export default config;
