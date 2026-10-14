/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF7300',
          black: '#1A1A1A',
          white: '#F9FAFB'
        }
      }
    },
  },
  plugins: [],
}
