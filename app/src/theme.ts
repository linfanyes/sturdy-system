// 主题变量（CSS 自定义属性）的浅色 / 暗色两套取值。
//
// 重要: 这里的值是 "RGB 通道三元组" (如 "255 249 238"), 不是 hex 颜色!
// 因为 tailwind.config.js 把自定义颜色定义为 rgb(var(--x) / <alpha-value>) 形式,
// Tailwind 才能支持 opacity 修饰符 (bg-cocoa-900/5 等), 同时运行时改 --x 即可整站换肤.
export type ThemeMode = 'light' | 'dark'

export const THEME_VARS: Record<ThemeMode, Record<string, string>> = {
  light: {
    '--cream-50': '255 252 245',
    '--cream-100': '255 249 238',
    '--cream-200': '255 241 217',
    '--cream-300': '255 231 184',
    '--butter-100': '255 234 184',
    '--butter-300': '255 218 142',
    '--butter-400': '255 212 121',
    '--butter-500': '245 190 82',
    '--butter-600': '216 156 44',
    '--mint-100': '214 245 226',
    '--mint-300': '168 232 194',
    '--mint-400': '127 216 164',
    '--mint-500': '84 188 131',
    '--sakura-100': '255 224 233',
    '--sakura-300': '255 184 204',
    '--sakura-400': '255 158 181',
    '--sakura-500': '244 123 152',
    '--sky2-100': '212 236 255',
    '--sky2-300': '164 214 255',
    '--sky2-400': '123 198 255',
    '--sky2-500': '79 163 224',
    '--cocoa-100': '200 181 154',
    '--cocoa-300': '142 120 88',
    '--cocoa-500': '122 106 85',
    '--cocoa-700': '82 63 42',
    '--cocoa-900': '61 46 31'
  },
  dark: {
    '--cream-50': '33 26 18',
    '--cream-100': '42 33 24',
    '--cream-200': '53 42 29',
    '--cream-300': '70 55 31',
    '--butter-100': '74 61 36',
    '--butter-300': '110 92 52',
    '--butter-400': '201 162 78',
    '--butter-500': '224 184 94',
    '--butter-600': '184 144 47',
    '--mint-100': '27 51 41',
    '--mint-300': '44 87 67',
    '--mint-400': '79 158 120',
    '--mint-500': '95 191 146',
    '--sakura-100': '62 32 39',
    '--sakura-300': '110 58 72',
    '--sakura-400': '199 122 142',
    '--sakura-500': '224 140 160',
    '--sky2-100': '28 49 64',
    '--sky2-300': '44 78 100',
    '--sky2-400': '90 147 184',
    '--sky2-500': '111 176 214',
    '--cocoa-100': '74 63 48',
    '--cocoa-300': '138 122 99',
    '--cocoa-500': '201 184 156',
    '--cocoa-700': '224 211 188',
    '--cocoa-900': '242 232 216'
  },
}

/** 把指定主题的变量设置到 <html> 上（内联 style, 运行时生效, 优先级高于样式表） */
export function applyThemeVars(mode: ThemeMode) {
  const vars = THEME_VARS[mode] || THEME_VARS.light
  const root = document.documentElement
  for (const key in vars) {
    root.style.setProperty(key, vars[key])
  }
}
