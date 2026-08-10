"use strict";
/**
 * shared/utils/export-data.ts —— 跨端导出内容生成（纯数据→文本结构）。
 *
 * 提供平台无关的"纯内容生成"函数（HTML 文档包膜 / 多字段拼接 / 文件名清理 / 列宽计算）。
 * 不含任何 Blob、URL、document、XLSX、docx 等平台 I/O 调用——这些留给各自端：
 *   - Web：web-app/src/utils/download.ts（Blob + URL.createObjectURL）
 *   - 小程序：mini-program/src/common/exporter.js（uni 文件系统 + 预览器）
 *
 * 分层：shared 端产"结构化字符串/数组"→ 端侧各自落地为具体文件格式。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeFilename = sanitizeFilename;
exports.escapeHtml = escapeHtml;
exports.buildWordHtml = buildWordHtml;
exports.buildHeaderBlock = buildHeaderBlock;
exports.composeDocContent = composeDocContent;
exports.computeXlsxLayout = computeXlsxLayout;
/** 清理文件名中的非法字符（\ / : * ? " < > |）并截断到 80 字符 */
function sanitizeFilename(name) {
    return (name || '未命名').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
}
/** HTML 实体转义（防内容中的 <>& 破坏 doc 结构） */
function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
/**
 * 构造可被 Word / WPS 直接打开的"HTML-in-.doc"文档。
 * 输出是可写入 .doc 文件的 UTF-8 字符串（不含 Blob 包装）。
 *
 * 典型端侧用法：
 *   Web：`new Blob([html], { type: 'application/msword' })`
 *   小程序：写入临时文件 → `uni.openDocument`
 */
function buildWordHtml(options) {
    const { title = '', body, fontFamily = "'宋体',SimSun,serif", fontSizePt = 12 } = options;
    const safeTitle = escapeHtml(title);
    const nl2br = escapeHtml(body); // pre-wrap 保留换行
    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${safeTitle}</title>
<style>body{font-family:${fontFamily};font-size:${fontSizePt}pt;line-height:1.8;white-space:pre-wrap;}h1{font-size:${Math.round(fontSizePt * 1.5)}pt;text-align:center;margin-bottom:16pt;}</style>
</head>
${title ? `<body><h1>${safeTitle}</h1>${nl2br}</body></html>` : `<body>${nl2br}</body></html>`}`;
}
/**
 * 多字段拼成"头部说明块"（如教案标题/学科/年级/课题 + 正文）。
 * 仅拼接纯字符串，不含平台 I/O。
 */
function buildHeaderBlock(fields) {
    return Object.entries(fields)
        .filter(([, v]) => v != null && String(v).trim() !== '')
        .map(([k, v]) => `${k}：${v}`)
        .join('\n');
}
/**
 * 结合 header 块与正文，形成最终文档字符串。
 * 当 header 块为空时直接返回正文，避免多余空行。
 */
function composeDocContent(fields, content) {
    const header = buildHeaderBlock(fields);
    return header ? `${header}\n\n${content}` : content;
}
/**
 * XLSX 列宽预计算（基于列内容字符长度的启发式）。
 * 仅做纯数据计算，不依赖 XLSX 库。
 *
 * @param header 表头（如 ['姓名','分数']）
 * @param rows   数据行的二维数组
 * @param sheetName 工作表名
 * @returns 包含列宽信息（wch 字符数）与数据行数，供端侧传给 ws['!cols']
 *
 * 端侧用法：
 *   const { colWidths } = computeXlsxLayout(header, rows)
 *   ws['!cols'] = colWidths
 */
function computeXlsxLayout(header, rows, opts) {
    const maxColWidth = opts?.maxColWidth ?? 40;
    const padding = opts?.padding ?? 2;
    const colWidths = header.map((_, ci) => {
        let max = (header[ci] || '').length * 2;
        rows.forEach((r) => {
            if (r[ci] != null)
                max = Math.max(max, String(r[ci]).length * 2);
        });
        return { wch: Math.min(max + padding, maxColWidth) };
    });
    return { colWidths, totalCols: header.length, totalRows: rows.length + 1 };
}
//# sourceMappingURL=export-data.js.map