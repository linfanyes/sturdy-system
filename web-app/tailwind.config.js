/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,vue}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: 'rgb(var(--cream-50) / <alpha-value>)',
          100: 'rgb(var(--cream-100) / <alpha-value>)',
          200: 'rgb(var(--cream-200) / <alpha-value>)',
          300: 'rgb(var(--cream-300) / <alpha-value>)',
        },
        butter: {
          100: 'rgb(var(--butter-100) / <alpha-value>)',
          300: 'rgb(var(--butter-300) / <alpha-value>)',
          400: 'rgb(var(--butter-400) / <alpha-value>)',
          500: 'rgb(var(--butter-500) / <alpha-value>)',
          600: 'rgb(var(--butter-600) / <alpha-value>)',
        },
        mint: {
          100: 'rgb(var(--mint-100) / <alpha-value>)',
          300: 'rgb(var(--mint-300) / <alpha-value>)',
          400: 'rgb(var(--mint-400) / <alpha-value>)',
          500: 'rgb(var(--mint-500) / <alpha-value>)',
        },
        sakura: {
          100: 'rgb(var(--sakura-100) / <alpha-value>)',
          300: 'rgb(var(--sakura-300) / <alpha-value>)',
          400: 'rgb(var(--sakura-400) / <alpha-value>)',
          500: 'rgb(var(--sakura-500) / <alpha-value>)',
        },
        sky2: {
          100: 'rgb(var(--sky2-100) / <alpha-value>)',
          300: 'rgb(var(--sky2-300) / <alpha-value>)',
          400: 'rgb(var(--sky2-400) / <alpha-value>)',
          500: 'rgb(var(--sky2-500) / <alpha-value>)',
        },
        cocoa: {
          100: 'rgb(var(--cocoa-100) / <alpha-value>)',
          300: 'rgb(var(--cocoa-300) / <alpha-value>)',
          500: 'rgb(var(--cocoa-500) / <alpha-value>)',
          700: 'rgb(var(--cocoa-700) / <alpha-value>)',
          900: 'rgb(var(--cocoa-900) / <alpha-value>)',
        },
      },
      fontFamily: {
        body: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
      boxShadow: {
        soft: '0 8px 24px rgba(190,140,80,.10)',
        softer: '0 4px 14px rgba(190,140,80,.08)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: { fadeIn: 'fadeIn .35s ease-out both' },
    },
  },
  plugins: [],
}
