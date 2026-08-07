/**
 * 前端监控（轻量 RUM + 错误捕获）
 *
 * 能力：
 * 1. 全局错误捕获：window error / unhandledrejection
 * 2. Core Web Vitals：LCP / FID / INP / CLS（PerformanceObserver）
 * 3. 批量上报：3s 防抖队列，页面卸载用 sendBeacon 兜底
 * 4. 静默降级：写库失败不抛错；localStorage 兜底重试一次
 *
 * 上报端点：POST /monitor/log（后端 MonitorModule，公开 + Throttler 限速）
 */
import { getApiBase } from '@/api/request'

type MonitorType = 'error' | 'unhandledrejection' | 'vitals' | 'perf'

interface MonitorEntry {
  type: MonitorType
  page?: string
  message?: string
  stack?: string
  meta?: Record<string, any>
}

const QUEUE: MonitorEntry[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let initialized = false

/** 开发环境（vite dev）不上报，避免本地噪声；构建预览走生产逻辑 */
const ENABLED = typeof window !== 'undefined' && !import.meta.env.DEV

function currentPage(): string {
  try {
    return window.location.pathname + (window.location.hash || '')
  } catch {
    return ''
  }
}

function safeUrl(): string {
  try {
    // 去掉查询串与 hash，防敏感参数落库
    return window.location.origin + window.location.pathname
  } catch {
    return ''
  }
}

/** 入队（限 200 条防内存膨胀） */
function enqueue(entry: MonitorEntry) {
  if (QUEUE.length >= 200) QUEUE.shift()
  QUEUE.push(entry)
  scheduleFlush()
}

function scheduleFlush() {
  if (timer || !ENABLED) return
  timer = setTimeout(flush, 3000)
}

async function flush() {
  timer = null
  if (!QUEUE.length) return
  const batch = QUEUE.splice(0)
  const payload = batch.map((e) => ({
    ...e,
    page: e.page || currentPage(),
    url: safeUrl(),
    message: String(e.message || '').slice(0, 2000),
    stack: e.stack ? String(e.stack).slice(0, 10000) : undefined,
    meta: e.meta ? JSON.stringify(e.meta).slice(0, 20000) : undefined,
  }))
  try {
    const base = getApiBase()
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      if (!navigator.sendBeacon(base + '/monitor/log', blob)) {
        // sendBeacon 失败（如请求体过大）回退 fetch
        await fetch(base + '/monitor/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        })
      }
    } else {
      await fetch(base + '/monitor/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
  } catch {
    // 静默失败：localStorage 兜底重试一次
    try {
      const key = 'monitor_retry'
      const prev = localStorage.getItem(key)
      if (!prev) {
        localStorage.setItem(key, JSON.stringify(payload))
      } else {
        localStorage.removeItem(key)
      }
    } catch {
      /* ignore */
    }
  }
}

/** 页面隐藏/卸载时立即冲刷（sendBeacon） */
function onVisibility() {
  if (document.visibilityState === 'hidden') flush()
}

export function reportMonitor(entry: MonitorEntry) {
  if (!ENABLED) {
    // dev 下仅控制台提示，便于本地调试
    // eslint-disable-next-line no-console
    if (import.meta.env.DEV) console.warn('[monitor]', entry.type, entry.message)
    return
  }
  enqueue(entry)
}

function observeVitals() {
  if (typeof PerformanceObserver === 'undefined') return

  // LCP
  try {
    const lcp = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime?: number }
      if (last) {
        enqueue({
          type: 'vitals',
          message: 'LCP',
          meta: { value: Math.round(last.startTime || 0), rating: last.startTime && last.startTime <= 2500 ? 'good' : last.startTime <= 4000 ? 'needs-improvement' : 'poor' },
        })
      }
    })
    lcp.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch { /* ignore */ }

  // FID（首个输入延迟）
  try {
    const fid = new PerformanceObserver((list) => {
      const entry = list.getEntries()[0] as PerformanceEventTiming
      if (entry) {
        enqueue({
          type: 'vitals',
          message: 'FID',
          meta: { value: Math.round(entry.processingStart - entry.startTime), rating: entry.processingStart - entry.startTime <= 100 ? 'good' : 'needs-improvement' },
        })
      }
    })
    fid.observe({ type: 'first-input', buffered: true })
  } catch { /* ignore */ }

  // INP（交互延迟，汇总）
  try {
    const inp = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEventTiming[]
      if (!entries.length) return
      let worst = 0
      for (const e of entries) worst = Math.max(worst, e.processingStart - e.startTime)
      enqueue({ type: 'vitals', message: 'INP', meta: { value: Math.round(worst) } })
    })
    inp.observe({ type: 'event', durationThreshold: 40, buffered: true } as PerformanceObserverInit)
  } catch { /* ignore */ }

  // CLS（累积布局偏移，页面生命周期内累加）
  try {
    let cls = 0
    const clsObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as Array<{ hadRecentInput: boolean; value: number }>) {
        if (!entry.hadRecentInput) cls += entry.value
      }
    })
    clsObs.observe({ type: 'layout-shift', buffered: true })
    window.addEventListener('pagehide', () => {
      if (cls > 0) {
        enqueue({
          type: 'vitals',
          message: 'CLS',
          meta: { value: Math.round(cls * 1000) / 1000, rating: cls <= 0.1 ? 'good' : cls <= 0.25 ? 'needs-improvement' : 'poor' },
        })
        flush()
      }
    })
  } catch { /* ignore */ }
}

/** 在 App 入口调用一次 */
export function initMonitor() {
  if (initialized || !ENABLED) return
  initialized = true

  window.addEventListener('error', (e) => {
    reportMonitor({
      type: 'error',
      message: e.message || '未知错误',
      stack: e.error?.stack || e.filename || '',
      meta: { lineno: e.lineno, colno: e.colno },
    })
  })

  window.addEventListener('unhandledrejection', (e) => {
    const reason: any = e.reason
    reportMonitor({
      type: 'unhandledrejection',
      message: reason?.message || String(reason || 'Promise rejection'),
      stack: reason?.stack || '',
    })
  })

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', () => flush())

  observeVitals()

  // 兜底重试 localStorage 中未上报的批次
  try {
    const key = 'monitor_retry'
    const prev = localStorage.getItem(key)
    if (prev) {
      localStorage.removeItem(key)
      try {
        QUEUE.push(...(JSON.parse(prev) as MonitorEntry[]).map((p) => ({ ...p, type: (p.type || 'error') as MonitorType })))
        scheduleFlush()
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}
