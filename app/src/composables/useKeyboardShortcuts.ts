/**
 * 键盘快捷键 composable
 *
 * 支持的快捷键:
 * - Ctrl/Cmd + N: 新建 (由各页面自行实现)
 * - Ctrl/Cmd + F: 聚焦搜索框
 * - Esc: 关闭弹窗 / 取消当前操作
 * - Ctrl/Cmd + S: 保存 (预留)
 * - Ctrl/Cmd + K: 全局搜索 (预留)
 *
 * 用法:
 *   const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts()
 *   registerShortcut('n', (e) => { ... }, { ctrl: true })
 */

import { onMounted, onUnmounted } from 'vue'

interface ShortcutOptions {
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  preventDefault?: boolean
}

interface ShortcutHandler {
  key: string
  options: ShortcutOptions
  handler: (e: KeyboardEvent) => void
}

const shortcuts: ShortcutHandler[] = []

function isMac(): boolean {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0
}

function matchModifier(e: KeyboardEvent, options: ShortcutOptions): boolean {
  const needCtrl = options.ctrl || options.meta // meta 在 Windows 上等价于 ctrl
  const needShift = options.shift || false
  const needAlt = options.alt || false

  const modPressed = isMac() ? e.metaKey : e.ctrlKey

  if (needCtrl && !modPressed) return false
  if (!needCtrl && modPressed) return false
  if (needShift && !e.shiftKey) return false
  if (!needShift && e.shiftKey) return false
  if (needAlt && !e.altKey) return false
  if (!needAlt && e.altKey) return false

  return true
}

function handleKeyDown(e: KeyboardEvent) {
  // 在输入框中时不触发快捷键 (Esc 除外)
  const target = e.target as HTMLElement
  const isInput =
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable

  if (isInput && e.key !== 'Escape') return

  for (const shortcut of shortcuts) {
    if (e.key.toLowerCase() === shortcut.key.toLowerCase() && matchModifier(e, shortcut.options)) {
      if (shortcut.options.preventDefault !== false) {
        e.preventDefault()
      }
      shortcut.handler(e)
      break
    }
  }
}

/**
 * 注册快捷键
 * @param key 按键 (如 'n', 'f', 'Escape')
 * @param handler 处理函数
 * @param options 修饰键选项
 */
export function registerShortcut(
  key: string,
  handler: (e: KeyboardEvent) => void,
  options: ShortcutOptions = {},
): () => void {
  const shortcut: ShortcutHandler = { key, options, handler }
  shortcuts.push(shortcut)

  // 返回取消注册的函数
  return () => {
    const index = shortcuts.indexOf(shortcut)
    if (index > -1) shortcuts.splice(index, 1)
  }
}

/**
 * 取消注册快捷键
 */
export function unregisterShortcut(key: string, options: ShortcutOptions = {}): void {
  for (let i = shortcuts.length - 1; i >= 0; i--) {
    const s = shortcuts[i]
    if (s.key.toLowerCase() === key.toLowerCase() && JSON.stringify(s.options) === JSON.stringify(options)) {
      shortcuts.splice(i, 1)
    }
  }
}

/**
 * Composable 形式, 自动在组件卸载时清理
 */
export function useKeyboardShortcuts() {
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    registerShortcut,
    unregisterShortcut,
  }
}

/**
 * 全局初始化常用快捷键
 * 在 main.ts 中调用一次即可
 */
export function initGlobalShortcuts(): void {
  window.addEventListener('keydown', handleKeyDown)

  // Esc: 关闭所有打开的弹窗 (查找 .modal 并关闭)
  registerShortcut('Escape', () => {
    // 关闭最上层的 modal
    const modals = document.querySelectorAll('[data-modal]')
    if (modals.length > 0) {
      const lastModal = modals[modals.length - 1] as HTMLElement
      const closeBtn = lastModal.querySelector('[data-modal-close]') as HTMLElement
      if (closeBtn) closeBtn.click()
    }
  })
}
