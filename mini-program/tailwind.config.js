/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FFFcf5',
          100: '#FFF9ee',
          200: '#FFF1d9',
          300: '#FFE7b8',
        },
        butter: {
          100: '#FFEAb8',
          300: '#FFDA8e',
          400: '#FFD479',
          500: '#F5BE52',
          600: '#D89c2c',
        },
        mint: {
          100: '#D6F5e2',
          300: '#A8E8c2',
          400: '#7FD8a4',
          500: '#54bc83',
        },
        sakura: {
          100: '#FFE0e9',
          300: '#FFb8cc',
          400: '#FF9eb5',
          500: '#F47b98',
        },
        sky2: {
          100: '#D4ecff',
          300: '#A4d6ff',
          400: '#7bc6ff',
          500: '#4fa3e0',
        },
        cocoa: {
          100: '#C8b59a',
          300: '#8e7858',
          500: '#7a6a55',
          700: '#523f2a',
          900: '#3d2e1f',
        },
      },
    },
  },
  plugins: [],
}
