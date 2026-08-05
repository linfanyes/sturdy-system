/**
 * 复制 / 打印工具：用于「专项资源库」等页面的小类复制与打印。
 *
 * - copyText: 写入剪贴板（优先 navigator.clipboard，非安全上下文降级 execCommand）
 * - printHtml: 用隐藏 iframe 渲染指定 HTML 并调起打印（避免受 SPA 样式/弹窗拦截影响）
 * - notify: 轻量顶部提示
 * - escapeHtml: HTML 转义，构建打印内容时使用
 */

let toastTimer: ReturnType<typeof setTimeout> | null = null

/** 轻量顶部提示（成功/错误） */
export function notify(message: string, type: 'success' | 'error' = 'success') {
  let el = document.getElementById('cp-toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'cp-toast'
    el.style.cssText =
      'position:fixed;left:50%;top:20px;transform:translateX(-50%);z-index:99999;' +
      'padding:8px 16px;border-radius:12px;font-size:14px;font-weight:500;' +
      'box-shadow:0 6px 20px rgba(0,0,0,.12);opacity:0;transition:opacity .25s;pointer-events:none;'
    document.body.appendChild(el)
  }
  el.textContent = message
  el.style.background = type === 'success' ? '#5b8c5a' : '#d9534f'
  el.style.color = '#fff'
  // 触发过渡
  requestAnimationFrame(() => { if (el) el.style.opacity = '1' })
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { if (el) el.style.opacity = '0' }, 1600)
}

/** 复制到剪贴板，返回是否成功 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* 降级到 execCommand */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** HTML 转义，构建打印内容时防止内容破坏标签结构 */
export function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const PRINT_STYLE = `
  body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:#222;padding:24px;line-height:1.7;max-width:800px;margin:0 auto;}
  h1{font-size:20px;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f4c430;color:#7a5c2e;}
  .grp{margin-bottom:18px;}
  .grp h2{font-size:15px;color:#7a5c2e;margin:0 0 8px;padding-left:8px;border-left:3px solid #f4c430;}
  .item{page-break-inside:avoid;margin:0 0 10px;padding:0 0 8px;border-bottom:1px dashed #eee;}
  .item:last-child{border-bottom:none;}
  .word{font-size:15px;font-weight:600;color:#222;}
  .ph{color:#2e8b57;font-family:"Courier New",monospace;font-size:12px;margin-left:6px;}
  .mean{color:#444;margin-top:2px;}
  .ex{color:#888;font-size:12px;font-style:italic;margin-top:2px;}
  .formula{font-family:"Courier New",monospace;font-size:16px;background:#faf7f0;padding:6px 10px;border-radius:8px;display:inline-block;color:#222;}
  .meta{color:#999;font-size:12px;margin-top:3px;}
  .poem{white-space:pre-line;color:#222;}
  @media print{body{padding:0;}}
`

/**
 * 用隐藏 iframe 打印指定 HTML 内容。
 * @param title   打印文档标题（同时显示在页眉 h1）
 * @param bodyHtml 已转义的正文 HTML（可含 <h1>/<div class="grp"> 等）
 */
export function printHtml(title: string, bodyHtml: string) {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)
  const w = iframe.contentWindow
  if (!w) {
    notify('打印初始化失败', 'error')
    return
  }
  const doc = w.document
  doc.open()
  doc.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
      escapeHtml(title) +
      '</title><style>' +
      PRINT_STYLE +
      '</style></head><body>' +
      bodyHtml +
      '</body></html>',
  )
  doc.close()

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
  }
  w.addEventListener('afterprint', () => setTimeout(cleanup, 200))
  setTimeout(() => {
    w.focus()
    w.print()
  }, 120)
  // 安全兜底：若 afterprint 未触发，1 分钟后清理
  setTimeout(cleanup, 60000)
}
