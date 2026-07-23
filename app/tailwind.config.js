/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,vue}'],
  theme: {
    container: {
      center: true,
    },
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
        display: ['"ZCOOL KuaiLe"', '"Ma Shan Zheng"', 'cursive'],
        hand: ['"Ma Shan Zheng"', '"Caveat"', 'cursive'],
        body: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        number: ['Caveat', 'Nunito', 'sans-serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(190,140,80,.10)',
        softer: '0 4px 14px rgba(190,140,80,.08)',
        pop: '0 12px 32px rgba(255, 180, 80, .25)',
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        wiggle: {
          '0%,100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        roll: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-100%)' },
        },
        wiggleSlow: {
          '0%,100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        bouncey: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-14px) scale(1.04)' },
        },
      },
      animation: {
        floaty: 'floaty 4s ease-in-out infinite',
        wiggle: 'wiggle 1s ease-in-out infinite',
        fadeIn: 'fadeIn .35s ease-out both',
        pop: 'pop .3s cubic-bezier(.18,.89,.32,1.28) both',
        roll: 'roll .25s linear infinite',
        wiggleSlow: 'wiggleSlow 6s ease-in-out infinite',
        bouncey: 'bouncey 1.3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
