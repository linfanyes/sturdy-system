/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,vue}'],
  theme: {
    extend: {
      colors: {
        // 表面色（surface）：亮=白 / 暗=暖棕卡色，供 bg-surface 等内联类在暗色下自动适配
        surface: 'rgb(var(--surface) / <alpha-value>)',
        cream: {
          50: 'rgb(var(--cream-50) / <alpha-value>)',
          100: 'rgb(var(--cream-100) / <alpha-value>)',
          200: 'rgb(var(--cream-200) / <alpha-value>)',
          300: 'rgb(var(--cream-300) / <alpha-value>)',
        },
        butter: {
          50: 'rgb(var(--butter-50) / <alpha-value>)',
          100: 'rgb(var(--butter-100) / <alpha-value>)',
          200: 'rgb(var(--butter-200) / <alpha-value>)',
          300: 'rgb(var(--butter-300) / <alpha-value>)',
          400: 'rgb(var(--butter-400) / <alpha-value>)',
          500: 'rgb(var(--butter-500) / <alpha-value>)',
          600: 'rgb(var(--butter-600) / <alpha-value>)',
        },
        mint: {
          50: 'rgb(var(--mint-50) / <alpha-value>)',
          100: 'rgb(var(--mint-100) / <alpha-value>)',
          300: 'rgb(var(--mint-300) / <alpha-value>)',
          400: 'rgb(var(--mint-400) / <alpha-value>)',
          500: 'rgb(var(--mint-500) / <alpha-value>)',
          600: 'rgb(var(--mint-600) / <alpha-value>)',
        },
        sakura: {
          50: 'rgb(var(--sakura-50) / <alpha-value>)',
          100: 'rgb(var(--sakura-100) / <alpha-value>)',
          300: 'rgb(var(--sakura-300) / <alpha-value>)',
          400: 'rgb(var(--sakura-400) / <alpha-value>)',
          500: 'rgb(var(--sakura-500) / <alpha-value>)',
          600: 'rgb(var(--sakura-600) / <alpha-value>)',
        },
        sky2: {
          50: 'rgb(var(--sky2-50) / <alpha-value>)',
          100: 'rgb(var(--sky2-100) / <alpha-value>)',
          300: 'rgb(var(--sky2-300) / <alpha-value>)',
          400: 'rgb(var(--sky2-400) / <alpha-value>)',
          500: 'rgb(var(--sky2-500) / <alpha-value>)',
          600: 'rgb(var(--sky2-600) / <alpha-value>)',
        },
        cocoa: {
          50: 'rgb(var(--cocoa-50) / <alpha-value>)',
          100: 'rgb(var(--cocoa-100) / <alpha-value>)',
          300: 'rgb(var(--cocoa-300) / <alpha-value>)',
          400: 'rgb(var(--cocoa-400) / <alpha-value>)',
          500: 'rgb(var(--cocoa-500) / <alpha-value>)',
          600: 'rgb(var(--cocoa-600) / <alpha-value>)',
          700: 'rgb(var(--cocoa-700) / <alpha-value>)',
          800: 'rgb(var(--cocoa-800) / <alpha-value>)',
          900: 'rgb(var(--cocoa-900) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Smiley Sans"', '"ZCOOL KuaiLe"', '"Ma Shan Zheng"', '"Noto Sans SC"', 'cursive'],
        hand: ['"Ma Shan Zheng"', '"Caveat"', 'cursive'],
        body: ['"HarmonyOS Sans SC"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        sans: ['"HarmonyOS Sans SC"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        num: ['"Familjen Grotesk"', '"SF Pro Display"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
      boxShadow: {
        soft: '0 8px 24px rgba(190,140,80,.10)',
        softer: '0 4px 14px rgba(190,140,80,.08)',
        pop: '0 12px 32px rgba(255, 180, 80, .25)',
        // 有机三层投影：模拟纸张悬浮，光源统一 145deg 左上
        paper: '0 1px 2px rgba(174,140,90,.04), 0 4px 12px rgba(174,140,90,.06), 0 12px 28px rgba(174,140,90,.04)',
        lift: '0 2px 4px rgba(174,140,90,.06), 0 8px 20px rgba(174,140,90,.10), 0 20px 40px rgba(190,140,80,.08)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        growIn: { '0%': { opacity: '0', transform: 'translateY(14px) scale(.98)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        wiggle: {
          '0%,100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        wiggleSlow: {
          '0%,100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        bouncey: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-14px) scale(1.04)' },
        },
        sweep: { '0%': { transform: 'translateX(-120%)' }, '100%': { transform: 'translateX(120%)' } },
      },
      animation: {
        fadeIn: 'fadeIn .35s ease-out both',
        growIn: 'growIn .6s cubic-bezier(.22,1,.36,1) both',
        floaty: 'floaty 4s ease-in-out infinite',
        wiggle: 'wiggle 1s ease-in-out infinite',
        wiggleSlow: 'wiggleSlow 6s ease-in-out infinite',
        bouncey: 'bouncey 1.3s ease-in-out infinite',
        sweep: 'sweep 1s ease',
      },
    },
  },
  plugins: [],
}
