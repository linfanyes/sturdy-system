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
/** 清理文件名中的非法字符（\ / : * ? " < > |）并截断到 80 字符 */
export declare function sanitizeFilename(name: string): string;
/** HTML 实体转义（防内容中的 <>& 破坏 doc 结构） */
export declare function escapeHtml(s: string): string;
export interface BuildWordHtmlOptions {
    /** 文档标题（含在 <title> 与 <h1> 中） */
    title?: string;
    /** 正文字符串（含换行），将按 pre-wrap 样式保留空白与换行 */
    body: string;
    /** 字体族，默认 宋体（中文 .doc 场景最广泛兼容） */
    fontFamily?: string;
    /** 正文字号 pt，默认 12 */
    fontSizePt?: number;
}
/**
 * 构造可被 Word / WPS 直接打开的"HTML-in-.doc"文档。
 * 输出是可写入 .doc 文件的 UTF-8 字符串（不含 Blob 包装）。
 *
 * 典型端侧用法：
 *   Web：`new Blob([html], { type: 'application/msword' })`
 *   小程序：写入临时文件 → `uni.openDocument`
 */
export declare function buildWordHtml(options: BuildWordHtmlOptions): string;
/**
 * 多字段拼成"头部说明块"（如教案标题/学科/年级/课题 + 正文）。
 * 仅拼接纯字符串，不含平台 I/O。
 */
export declare function buildHeaderBlock(fields: Record<string, string | number | null | undefined>): string;
/**
 * 结合 header 块与正文，形成最终文档字符串。
 * 当 header 块为空时直接返回正文，避免多余空行。
 */
export declare function composeDocContent(fields: Record<string, string | number | null | undefined>, content: string): string;
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
export declare function computeXlsxLayout(header: string[], rows: string[][], opts?: {
    maxColWidth?: number;
    padding?: number;
}): {
    colWidths: {
        wch: number;
    }[];
    totalCols: number;
    totalRows: number;
};
//# sourceMappingURL=export-data.d.ts.map