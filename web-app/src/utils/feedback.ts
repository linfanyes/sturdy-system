import type { App } from 'vue'
import { reactive } from 'vue'

/**
 * 轻量全局反馈系统（替代原生 alert / confirm）。
 * - toast：展示型提示，无返回值，替代 alert()
 * - confirm：异步确认对话框，返回 Promise<boolean>，替代 confirm()
 * - installFeedback()：把 window.alert / window.confirm 覆盖为自定义实现，
 *   从而零侵入地消除全站原生弹窗（无需逐处改代码）。
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
  duration: number
}

export interface ConfirmOptions {
  title?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmState {
  open: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  danger: boolean
  resolve: ((value: boolean) => void) | null
}

// ---- Toast 单例 ----
const toasts = reactive<ToastItem[]>([])
let toastSeq = 0

export function dismissToast(id: number): void {
  const i = toasts.findIndex((t) => t.id === id)
  if (i >= 0) toasts.splice(i, 1)
}

export function pushToast(message: string, type: ToastType = 'info', duration = 3000): number {
  const id = ++toastSeq
  toasts.push({ id, message, type, duration })
  if (duration > 0) {
    window.setTimeout(() => dismissToast(id), duration)
  }
  return id
}

export type ToastFn = ((message: string, type?: ToastType, duration?: number) => number) & {
  success: (message: string, duration?: number) => number
  error: (message: string, duration?: number) => number
  info: (message: string, duration?: number) => number
  warning: (message: string, duration?: number) => number
}

export const toast = Object.assign(
  (message: string, type: ToastType = 'info', duration?: number) => pushToast(message, type, duration),
  {
    success: (message: string, duration?: number) => pushToast(message, 'success', duration),
    error: (message: string, duration?: number) => pushToast(message, 'error', duration),
    info: (message: string, duration?: number) => pushToast(message, 'info', duration),
    warning: (message: string, duration?: number) => pushToast(message, 'warning', duration),
  },
) as ToastFn

export function useToasts() {
  return { toasts, dismissToast }
}

// ---- Confirm 单例 ----
const confirmState = reactive<ConfirmState>({
  open: false,
  title: '提示',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  danger: false,
  resolve: null,
})

export function confirm(message: string, opts: ConfirmOptions = {}): Promise<boolean> {
  confirmState.title = opts.title ?? '提示'
  confirmState.message = message
  confirmState.confirmText = opts.confirmText ?? '确定'
  confirmState.cancelText = opts.cancelText ?? '取消'
  confirmState.danger = opts.danger ?? false
  confirmState.open = true
  return new Promise<boolean>((resolve) => {
    confirmState.resolve = resolve
  })
}

export function resolveConfirm(value: boolean): void {
  confirmState.open = false
  const r = confirmState.resolve
  confirmState.resolve = null
  r?.(value)
}

export function useConfirmState() {
  return confirmState
}

// ---- 安装：覆盖原生 alert/confirm ----
export function installFeedback(_app: App): void {
  // 覆盖原生 alert → toast（alert 无返回值，覆盖零风险）
  ;(window as unknown as { alert: (msg?: unknown) => void }).alert = (msg?: unknown) => {
    toast(String(msg ?? ''))
  }
  // 覆盖原生 confirm → 异步 confirm（全站调用点已确认全部 await 化，可安全启用）
  ;(window as unknown as { confirm: (msg?: unknown) => Promise<boolean> }).confirm = (msg?: unknown) =>
    confirm(String(msg ?? ''))
}
