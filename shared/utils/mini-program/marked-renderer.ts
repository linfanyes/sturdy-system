/**
 * ⚠️ 小程序专属模块 — 仅用于 uni-app 微信小程序端。
 * 使用 rpx 单位 + <view>/<text>/<image> 小程序组件标签，浏览器环境无法渲染。
 * Web 端请使用 marked + DOMPurify 方案。
 * P0-3修复：从 shared/utils/ 移至 shared/utils/mini-program/，明确平台归属。
 */

const SZ: Record<number, number> = { 1: 40, 2: 36, 3: 32, 4: 30, 5: 28, 6: 26 }
const LIGHT = { fg: '#333', sub: '#888', codeBg: '#f5f5f5', codeFg: '#c7254e', border: '#d9d9d9', link: '#07c160', strong: '#222' }
const DARK = { fg: '#e6e6e6', sub: '#9aa0a6', codeBg: '#262b34', codeFg: '#ff9b9b', border: '#3a3f47', link: '#3fd07f', strong: '#ffffff' }

export function createSafeRenderer(getThemeMode: () => 'light' | 'dark' = () => 'light') {
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const renderer: Record<string, any> = {
    heading(t: any) {
      const c = getThemeMode() === 'dark' ? DARK : LIGHT
      return `<view style="font-size:${SZ[t.depth] || 30}rpx;font-weight:700;margin:18rpx 0 10rpx;color:${c.fg};line-height:1.4;">${this.parser.parseInline(t.tokens) || t.text}</view>`
    },
    paragraph(t: any) {
      const c = getThemeMode() === 'dark' ? DARK : LIGHT
      return `<view style="margin:10rpx 0;line-height:1.7;color:${c.fg};">${this.parser.parseInline(t.tokens) || t.text}</view>`
    },
    listitem(t: any) {
      const c = getThemeMode() === 'dark' ? DARK : LIGHT
      return `<li style="margin:8rpx 0;line-height:1.7;color:${c.fg};">• ${this.parser.parseInline(t.tokens) || t.text}</li>`
    },
    code(t: any) {
      const c = getThemeMode() === 'dark' ? DARK : LIGHT
      return `<view style="background:${c.codeBg};border-radius:12rpx;padding:18rpx;font-size:24rpx;margin:12rpx 0;white-space:pre-wrap;word-break:break-all;color:${c.codeFg};">${esc(t.text)}</view>`
    },
    codespan(t: any) {
      const c = getThemeMode() === 'dark' ? DARK : LIGHT
      return `<text style="background:${c.codeBg};padding:2rpx 8rpx;border-radius:6rpx;font-size:24rpx;color:${c.codeFg};">${t.text}</text>`
    },
    strong(t: any) {
      const c = getThemeMode() === 'dark' ? DARK : LIGHT
      return `<text style="font-weight:700;color:${c.strong};">${t.text}</text>`
    },
    em(t: any) {
      return `<text style="font-style:italic;">${t.text}</text>`
    },
    blockquote(t: any) {
      const c = getThemeMode() === 'dark' ? DARK : LIGHT
      return `<view style="border-left:6rpx solid ${c.border};padding:4rpx 20rpx;color:${c.sub};margin:12rpx 0;">${this.parser.parse(t.tokens) || t.text}</view>`
    },
    hr(t: any) {
      const c = getThemeMode() === 'dark' ? DARK : LIGHT
      return `<view style="height:1rpx;background:${c.border};margin:18rpx 0;"></view>`
    },
    link(t: any) {
      const c = getThemeMode() === 'dark' ? DARK : LIGHT
      return `<text style="color:${c.link};">${t.text}</text>`
    },
    html(t: any) {
      return esc(t.text || '')
    },
    image(t: any) {
      if (!t.href || !/^https?:\/\//i.test(t.href)) return esc(t.text || '图片')
      return `<image src="${esc(t.href)}" style="max-width:100%;border-radius:8rpx;margin:8rpx 0;" mode="widthFix"></image>`
    },
  }

  return renderer
}
