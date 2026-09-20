/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Breakpoints mirror the approved mockup: 620px (phones) and 900px (desktop grid).
    screens: {
      sm: "620px",
      md: "900px",
      lg: "1024px",
      xl: "1400px",
    },
    extend: {
      colors: {
        cream: "#f2e3c3",
        ink: "#2a190f",
        card: "#fbf2df",
        terra: "#a94422",
        terradeep: "#9f3d1c",
        eyebrow: "#9e4b27",
        tag: "#efc368",
        chip: "#ead8b7",
        muted: "#654b3b",
        pricemuted: "#765642",
        night: "#392217",
        nightdeep: "#24160f",
        nighttext: "#f7e8ce",
        nightmuted: "#dfcdb4",
        footertext: "#d8c6ad",
        cardborder: "rgba(75,43,24,.18)",
      },
      fontFamily: {
        serif: ['Georgia', '"Times New Roman"', "serif"],
        sans: ["Arial", "Helvetica", "sans-serif"],
      },
      maxWidth: {
        grid: "1400px",
        cardcol: "680px",
      },
    },
  },
  plugins: [],
};
