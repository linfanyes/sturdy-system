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
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    Table, TableCell, TableRow, BorderStyle, VerticalAlign, AlignmentType,
    UnderlineType,
  } = await import('docx')

  type ParagraphBlock = {
    kind: 'paragraph'
    element: InstanceType<typeof Paragraph>
    children: InstanceType<typeof TextRun>[]
    spacing?: any
  }
  type BlockChild = ParagraphBlock | InstanceType<typeof Table>

  function makeParagraph(opts: any): ParagraphBlock {
    const { children, spacing } = opts
    return { kind: 'paragraph', element: new Paragraph(opts), children: children || [], spacing }
  }

  /** 将 Markdown 内联 token 转成 docx TextRun */
  function inlineRuns(
    tokens: any[] | any | undefined,
    base: Record<string, any> = {},
  ): InstanceType<typeof TextRun>[] {
    if (!tokens) return []
    const arr = Array.isArray(tokens) ? tokens : [tokens]
    const runs: InstanceType<typeof TextRun>[] = []
    for (const t of arr) {
      switch (t.type) {
        case 'text':
        case 'html':
          runs.push(new TextRun({ ...base, text: t.text ?? t.raw ?? '' }))
          break
        case 'strong':
          runs.push(...inlineRuns(t.tokens, { ...base, bold: true }))
          break
        case 'em':
          runs.push(...inlineRuns(t.tokens, { ...base, italics: true }))
          break
        case 'del':
          runs.push(...inlineRuns(t.tokens, { ...base, strike: true }))
          break
        case 'codespan':
          runs.push(new TextRun({ ...base, text: t.text, font: 'Courier New' }))
          break
        case 'link':
          runs.push(
            ...inlineRuns(t.tokens, {
              ...base,
              color: '0563C1',
              underline: { type: UnderlineType.SINGLE },
            }),
          )
          break
        case 'image':
          // docx 中暂不嵌入图片，保留 alt 文本
          if (t.title || t.text) {
            runs.push(new TextRun({ ...base, text: `[图片: ${t.title || t.text}]` }))
          }
          break
        case 'br':
          runs.push(new TextRun({ ...base, text: '', break: 1 }))
          break
        default:
          if (t.text || t.raw) {
            runs.push(new TextRun({ ...base, text: t.text ?? t.raw }))
          }
      }
    }
    return runs
  }

  /** 将 Markdown 块级 token 转成 docx 段落/表格 */
  function blockChildren(tokens: any[]): BlockChild[] {
    const out: BlockChild[] = []
    for (const token of tokens) {
      switch (token.type) {
        case 'heading': {
          const children = inlineRuns(token.tokens)
          out.push(
            makeParagraph({
              heading:
                token.depth === 1
                  ? HeadingLevel.HEADING_1
                  : token.depth === 2
                    ? HeadingLevel.HEADING_2
                    : HeadingLevel.HEADING_3,
              spacing: { before: 240, after: 120 },
              children,
            }),
          )
          break
        }
        case 'paragraph': {
          const children = inlineRuns(token.tokens)
          out.push(
            makeParagraph({
              spacing: { after: 120 },
              children,
            }),
          )
          break
        }
        case 'code': {
          const codeLines = (token.text || '').split('\n')
          for (const line of codeLines) {
            out.push(
              makeParagraph({
                spacing: { after: 40 },
                shading: { fill: 'F5F5F5' },
                children: [new TextRun({ text: line, font: 'Courier New', size: 20 })],
              }),
            )
          }
          break
        }
        case 'blockquote':
          for (const child of blockChildren(token.tokens)) {
            if ('kind' in child && child.kind === 'paragraph') {
              out.push(
                makeParagraph({
                  spacing: child.spacing,
                  indent: { left: 720 },
                  shading: { fill: 'FAFAFA' },
                  children: child.children,
                }),
              )
            } else {
              out.push(child)
            }
          }
          break
        case 'list': {
          const level = (token as any).level || 0
          token.items.forEach((item: any, idx: number) => {
            const prefix = token.ordered ? `${idx + 1}. ` : '• '
            const itemChildren = blockChildren(item.tokens)
            itemChildren.forEach((child, cidx) => {
              if ('kind' in child && child.kind === 'paragraph') {
                const children = cidx === 0
                  ? [new TextRun({ text: prefix }), ...child.children]
                  : child.children
                out.push(
                  makeParagraph({
                    spacing: child.spacing,
                    indent: { left: level * 360 + (cidx === 0 ? 0 : 360) },
                    children,
                  }),
                )
              } else {
                out.push(child)
              }
            })
          })
          break
        }
        case 'hr':
          out.push(
            makeParagraph({
              border: {
                bottom: {
                  color: 'DDDDDD',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
              },
              spacing: { before: 120, after: 120 },
              children: [],
            }),
          )
          break
        case 'table': {
          const rows: InstanceType<typeof TableRow>[] = []
          // 表头
          if (token.header?.length) {
            rows.push(
              new TableRow({
                children: token.header.map((cell: any) =>
                  new TableCell({
                    children: [new Paragraph({ children: inlineRuns(cell.tokens) })],
                    shading: { fill: 'F0F0F0' },
                    verticalAlign: VerticalAlign.CENTER,
                  }),
                ),
              }),
            )
          }
          // 数据行
          for (const row of token.rows || []) {
            rows.push(
              new TableRow({
                children: row.map((cell: any) =>
                  new TableCell({
                    children: [new Paragraph({ children: inlineRuns(cell.tokens) })],
                    verticalAlign: VerticalAlign.CENTER,
                  }),
                ),
              }),
            )
          }
          if (rows.length) {
            out.push(
              new Table({
                rows,
                width: { size: 100, type: 'pct' as any },
                borders: {
                  top: { color: 'DDDDDD', space: 1, style: BorderStyle.SINGLE, size: 6 },
                  bottom: { color: 'DDDDDD', space: 1, style: BorderStyle.SINGLE, size: 6 },
                  left: { color: 'DDDDDD', space: 1, style: BorderStyle.SINGLE, size: 6 },
                  right: { color: 'DDDDDD', space: 1, style: BorderStyle.SINGLE, size: 6 },
                  insideHorizontal: { color: 'DDDDDD', space: 1, style: BorderStyle.SINGLE, size: 6 },
                  insideVertical: { color: 'DDDDDD', space: 1, style: BorderStyle.SINGLE, size: 6 },
                },
              }),
            )
          }
          break
        }
        case 'space':
          break
        default:
          if (token.text || token.raw) {
            out.push(makeParagraph({ children: [new TextRun({ text: token.text ?? token.raw })] }))
          }
      }
    }
    if (!out.length) out.push(makeParagraph({ children: [new TextRun(' ')] }))
    return out
  }

  function mdToDocxChildren(md: string): (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] {
    const tokens = marked.lexer(md || '')
    return blockChildren(tokens).map((child) => ('kind' in child ? child.element : child))
  }

  const doc = new Document({
    sections: [{ children: mdToDocxChildren(md) }],
  })
  const blob = await Packer.toBlob(doc)
  downloadBlob(filename, blob)
}

// 允许出现在 Markdown 渲染结果中的标签与属性白名单
const ALLOWED_TAGS = new Set([
  'p', 'div', 'br', 'hr', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 's', 'del', 'u',
  'a', 'code', 'pre', 'blockquote',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'img', 'sup', 'sub',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  '*': new Set(['class']),
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  code: new Set(['class']),
  pre: new Set(['class']),
}

function isAllowedUrl(url: string, tag: 'a' | 'img'): boolean {
  if (!url) return false
  const lower = url.toLowerCase().trim()
  if (tag === 'a') {
    return (
      lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      lower.startsWith('mailto:') ||
      lower.startsWith('tel:') ||
      lower.startsWith('#')
    )
  }
  // img
  return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:image/')
}

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return node.cloneNode()
  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (!ALLOWED_TAGS.has(tag)) return null

  const clean = doc.createElement(tag)
  for (const attr of el.attributes) {
    const name = attr.name.toLowerCase()
    // 移除所有事件处理器与危险协议
    if (name.startsWith('on')) continue
    const allowed = ALLOWED_ATTRS['*']?.has(name) || ALLOWED_ATTRS[tag]?.has(name)
    if (!allowed) continue

    const value = attr.value
    if (tag === 'a' && name === 'href') {
      if (!isAllowedUrl(value, 'a')) continue
      clean.setAttribute('rel', 'noopener noreferrer')
      clean.setAttribute('target', '_blank')
    }
    if (tag === 'img' && name === 'src') {
      if (!isAllowedUrl(value, 'img')) continue
    }
    clean.setAttribute(name, value)
  }

  for (const child of el.childNodes) {
    const sanitized = sanitizeNode(child, doc)
    if (sanitized) clean.appendChild(sanitized)
  }
  return clean
}

/**
 * HTML 消毒：移除 script、事件处理器、javascript: 链接等危险内容。
 * 用于对 AI 生成的 Markdown 渲染结果做二次过滤，防止 XSS。
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const frag = doc.createDocumentFragment()
  for (const child of doc.body.childNodes) {
    const sanitized = sanitizeNode(child, doc)
    if (sanitized) frag.appendChild(sanitized)
  }
  const wrapper = doc.createElement('div')
  wrapper.appendChild(frag)
  return wrapper.innerHTML
}

/** Markdown -> HTML (用于屏幕预览，输出已消毒) */
export function renderMarkdownToHtml(md: string): string {
  try {
    return sanitizeHtml(marked.parse(md, { breaks: true, gfm: true }) as string)
  } catch {
    return '<pre>' + (md || '').replace(/</g, '&lt;') + '</pre>'
  }
}

/** 打开新窗口渲染 HTML 并触发打印 (可另存为 PDF) */
export function printHtml(title: string, html: string) {
  const safeHtml = sanitizeHtml(html)
  const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const w = window.open('', '_blank', 'width=900,height=720')
  if (!w) {
    alert('请允许浏览器弹出窗口, 以便打印 / 另存为 PDF')
    return
  }
  w.document.write(
    `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>${safeTitle}</title>` +
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
      </style></head><body>${safeHtml}` +
      `<scr` +
      `ipt>window.onload=function(){setTimeout(function(){window.print();},350);};</scr` +
      `ipt></body></html>`,
  )
  w.document.close()
}
