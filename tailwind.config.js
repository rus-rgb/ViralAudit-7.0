/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'viral-cyan': '#00F2EA',
        'viral-cyan-dark': '#00D4D4',
        'viral-pink': '#FF0050',
      },
    },
  },
  plugins: [],
}
