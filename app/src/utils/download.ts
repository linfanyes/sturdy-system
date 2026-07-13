/**
 * 文档导出 / 下载工具
 *
 * 支持:
 *  - Markdown (.md) 下载
 *  - Word (.docx) 下载 (基于 docx 库, 将 Markdown 转为 OOXML)
 *  - 复制到剪贴板
 *  - 打印 / 另存为 PDF (把 Markdown 渲染为 HTML 后调用浏览器打印)
 *  - Markdown -> HTML (基于 marked, 用于屏幕预览)
 */

import { marked } from 'marked'
// docx 体积较大, 仅在导出 Word 时动态加载

/** 通用: 触发浏览器下载一个 Blob */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 下载 Markdown 文件 */
export function downloadMarkdown(filename: string, md: string) {
  downloadBlob(filename, new Blob([md], { type: 'text/markdown;charset=utf-8' }))
}

/** 复制到剪贴板 (带降级方案) */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** 下载 Word (.docx) 文件 */
export async function downloadDocx(filename: string, _title: string, md: string): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')

  /** 把 `**加粗**` 内联语法拆成 docx TextRun (支持加粗) */
  function runsFromInline(text: string): InstanceType<typeof TextRun>[] {
    const parts = text.split(/\*\*(.+?)\*\*/g)
    const runs: InstanceType<typeof TextRun>[] = []
    parts.forEach((p, i) => {
      if (!p) return
      runs.push(new TextRun({ text: p, bold: i % 2 === 1 }))
    })
    if (!runs.length) runs.push(new TextRun({ text }))
    return runs
  }

  /** 把 Markdown 转成 docx 段落 (支持 #/##/###、无序列表、有序列表、普通段落、空行) */
  function mdToDocxChildren(md: string): InstanceType<typeof Paragraph>[] {
    const lines = (md || '').replace(/\r\n/g, '\n').split('\n')
    const children: InstanceType<typeof Paragraph>[] = []
    for (const raw of lines) {
      const line = raw.replace(/\s+$/, '')
      if (!line.trim()) continue
      const h = /^(#{1,3})\s+(.*)$/.exec(line)
      if (h) {
        const level = h[1].length
        children.push(
          new Paragraph({
            heading:
              level === 1
                ? HeadingLevel.HEADING_1
                : level === 2
                  ? HeadingLevel.HEADING_2
                  : HeadingLevel.HEADING_3,
            children: [new TextRun({ text: h[2], bold: true })],
          }),
        )
        continue
      }
      const ul = /^[-*]\s+(.*)$/.exec(line)
      if (ul) {
        children.push(
          new Paragraph({ bullet: { level: 0 }, children: [new TextRun(ul[1])] }),
        )
        continue
      }
      const ol = /^(\d+)[.、)]\s+(.*)$/.exec(line)
      if (ol) {
        children.push(new Paragraph({ children: [new TextRun(`${ol[1]}. ${ol[2]}`)] }))
        continue
      }
      children.push(new Paragraph({ children: runsFromInline(line) }))
    }
    if (!children.length) children.push(new Paragraph({ children: [new TextRun(' ')] }))
    return children
  }

  const doc = new Document({
    sections: [{ children: mdToDocxChildren(md) }],
  })
  const blob = await Packer.toBlob(doc)
  downloadBlob(filename, blob)
}

/** Markdown -> HTML (用于屏幕预览) */
export function renderMarkdownToHtml(md: string): string {
  try {
    return marked.parse(md, { breaks: true, gfm: true }) as string
  } catch {
    return '<pre>' + (md || '').replace(/</g, '&lt;') + '</pre>'
  }
}

/** 打开新窗口渲染 HTML 并触发打印 (可另存为 PDF) */
export function printHtml(title: string, html: string) {
  const w = window.open('', '_blank', 'width=900,height=720')
  if (!w) {
    alert('请允许浏览器弹出窗口, 以便打印 / 另存为 PDF')
    return
  }
  w.document.write(
    `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>${title}</title>` +
      `<style>
        body{font-family:-apple-system,BlinkMacSystemFont,"Microsoft YaHei",sans-serif;line-height:1.75;color:#222;max-width:820px;margin:28px auto;padding:0 24px;}
        h1{font-size:25px;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:14px;}
        h2{font-size:20px;margin-top:26px;}
        h3{font-size:17px;margin-top:18px;}
        ul,ol{padding-left:24px;} li{margin:5px 0;}
        pre{background:#f6f6f6;padding:12px 14px;border-radius:8px;overflow:auto;white-space:pre-wrap;}
        code{background:#f0f0f0;padding:1px 5px;border-radius:4px;}
        blockquote{border-left:4px solid #ddd;margin:10px 0;padding:4px 14px;color:#555;background:#fafafa;}
        table{border-collapse:collapse;width:100%;margin:14px 0;} th,td{border:1px solid #ddd;padding:7px 10px;text-align:left;}
        hr{border:none;border-top:1px solid #eee;margin:18px 0;}
        @media print{body{margin:0;}}
      </style></head><body>${html}` +
      `<scr` +
      `ipt>window.onload=function(){setTimeout(function(){window.print();},350);};</scr` +
      `ipt></body></html>`,
  )
  w.document.close()
}
