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
          50: '#eefefb',
          100: '#d1fdf5',
          200: '#a3fbeb',
          300: '#66f5df',
          400: '#26ebd0',
          500: '#00f5d4', // Electric Mint/Teal primary
          600: '#00ccb0',
          700: '#00a38d',
          800: '#007a6a',
          900: '#006154',
          dark: '#060b13', // Deep Oceanic Slate
          card: '#0e1724', // Card backgrounds
        },
        accent: {
          500: '#ff0055', // Neon Pink/Magenta secondary
          600: '#d60047',
          700: '#a30036',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
