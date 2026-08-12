import { reactive } from 'vue'
import zhCN from './zh-CN'

type Messages = typeof zhCN

const messages: Record<string, Messages> = { 'zh-CN': zhCN }
const state = reactive({ locale: 'zh-CN' })

/**
 * 轻量 i18n：避免引入 vue-i18n 大依赖。
 * 支持点号路径：t('grades.classOverview') → '班级成绩速览'
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const parts = key.split('.')
  let node: any = messages[state.locale]
  for (const p of parts) {
    if (node == null) return key
    node = node[p]
  }
  if (typeof node !== 'string') return key
  if (params) {
    return node.replace(/\{(\w+)\}/g, (_m, k) => String(params[k] ?? `{${k}}`))
  }
  return node
}

export function setLocale(locale: string) {
  if (messages[locale]) state.locale = locale
}

export function getLocale() {
  return state.locale
}

export const i18n = { t, setLocale, getLocale }
export default i18n
