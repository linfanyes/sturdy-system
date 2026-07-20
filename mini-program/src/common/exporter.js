/**
 * 统一导出工具 —— 生成 .xlsx / .docx 文件并调起小程序预览/分享。
 * 依赖: xlsx (SheetJS), docx
 */

import * as XLSX from 'xlsx'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'

/**
 * 导出二维数组为 .xlsx 并打开预览
 * @param {string[][]} header  表头行（如 ['姓名','分数']）
 * @param {string[][]} rows    数据行
 * @param {string}     filename  不含扩展名，如 '成绩导出'
 * @param {string}     sheetName 工作表名
 */
export async function exportXlsx(header, rows, filename = '导出', sheetName = 'Sheet1') {
  const data = [header, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(data)
  // 自动列宽
  const colWidths = header.map((_, ci) => {
    let max = (header[ci] || '').length * 2
    rows.forEach((r) => { if (r[ci] != null) max = Math.max(max, String(r[ci]).length * 2) })
    return { wch: Math.min(max + 2, 40) }
  })
  ws['!cols'] = colWidths
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', bookSST: false })
  await saveAndOpen(wbout, filename + '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

/**
 * 导出纯文本为 .docx 并打开预览
 * @param {string} title   文档标题
 * @param {string} body    正文（支持 \n 换行）
 * @param {string} filename 不含扩展名
 */
export async function exportDocx(title, body, filename = '导出') {
  const children = []
  // 标题
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  )
  children.push(new Paragraph({ spacing: { after: 100 } })) // 空行

  // 正文：按行分割，空行加间距
  const lines = body.split('\n')
  for (const line of lines) {
    if (!line.trim()) {
      children.push(new Paragraph({ spacing: { after: 60 } }))
      continue
    }
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line, size: 24 })],
        spacing: { after: 80 },
      }),
    )
  }

  const doc = new Document({
    title,
    description: '由园丁工作台小程序生成',
    styles: { default: { document: { run: { size: 24, font: 'Microsoft YaHei' } } } },
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(doc)
  const buf = await blob.arrayBuffer()
  await saveAndOpen(buf, filename + '.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
}

/** 通用：写入临时文件 → 调起预览 */
function saveAndOpen(buffer, filename, mimeType) {
  return new Promise((resolve, reject) => {
    const fs = uni.getFileSystemManager()
    const path = wx.env.USER_DATA_PATH + '/' + filename
    // buffer 可能是 ArrayBuffer 或 Uint8Array
    const data = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer
    fs.writeFile({
      filePath: path,
      data: data.buffer ? data : buffer, // Uint8Array → ArrayBuffer
      encoding: undefined,
      success: () => {
        uni.openDocument({
          filePath: path,
          showMenu: true,
          success: () => resolve(path),
          fail: (e) => {
            // 无合适 app 打开时降级为复制文件名提示
            uni.showToast({ title: '文件已保存到临时目录：' + filename, icon: 'none' })
            resolve(path)
          },
        })
      },
      fail: (e) => reject(new Error('写入文件失败：' + (e.errMsg || ''))),
    })
  })
}
