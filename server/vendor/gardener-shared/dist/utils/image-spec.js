"use strict";
/**
 * shared/utils/image-spec.ts —— 图片压缩策略纯函数常量与计算。
 *
 * 不含任何平台 I/O（Canvas / uni.getImageInfo / document），仅把两端对齐的
 * "默认参数 + 尺寸计算 + 是否需要压缩的判断"抽为单一事实来源。
 *
 * 两端默认策略（对齐 docs/image-compression-spec.md）：
 *   - 长边上限 1280 px
 *   - 质量 0.8（即 80%）
 *   - JPEG 格式（最广泛兼容）
 *   - 小于阈值的文件跳过（避免无意义重编码）
 *
 * 端侧职责：
 *   - Web：`OffscreenCanvas` / `document.createElement('canvas')` + `toDataURL`
 *   - 小程序：`uni.getImageInfo` + `wx.createOffscreenCanvas`（或临时 canvas）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAGE_OUTPUT_FORMAT = exports.IMAGE_SKIP_COMPRESS_BYTES = exports.IMAGE_JPEG_QUALITY_PERCENT = exports.IMAGE_JPEG_QUALITY = exports.IMAGE_MAX_DIMENSION = void 0;
exports.computeScaledDimensions = computeScaledDimensions;
exports.shouldCompressBySize = shouldCompressBySize;
exports.normalizeQuality = normalizeQuality;
exports.qualityToPercent = qualityToPercent;
exports.shouldSkipCompressByFileSize = shouldSkipCompressByFileSize;
/** 默认长边上限（像素） */
exports.IMAGE_MAX_DIMENSION = 1280;
/** 默认 JPEG 质量（0-1 区间） */
exports.IMAGE_JPEG_QUALITY = 0.8;
/** 默认质量（0-100 区间，兼容小程序端习惯表示） */
exports.IMAGE_JPEG_QUALITY_PERCENT = 80;
/** 小于此字节数的文件跳过压缩（避免无意义重编码） */
exports.IMAGE_SKIP_COMPRESS_BYTES = 200 * 1024;
/** 输出格式 */
exports.IMAGE_OUTPUT_FORMAT = 'image/jpeg';
/**
 * 根据原始尺寸计算缩放后的尺寸（保持宽高比）。
 * 纯计算，无平台 I/O。
 */
function computeScaledDimensions(orig, opts) {
    const maxWidth = opts?.maxWidth ?? exports.IMAGE_MAX_DIMENSION;
    const maxHeight = opts?.maxHeight ?? exports.IMAGE_MAX_DIMENSION;
    const allowUpscale = opts?.allowUpscale ?? false;
    const { width, height } = orig;
    if (width <= 0 || height <= 0)
        return { width, height };
    const ratio = Math.min(maxWidth / width, maxHeight / height, allowUpscale ? Infinity : 1);
    if (ratio >= 1)
        return { width, height };
    return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio),
    };
}
/** 判断图片是否需要压缩（基于尺寸是否超限） */
function shouldCompressBySize(orig, opts) {
    const maxWidth = opts?.maxWidth ?? exports.IMAGE_MAX_DIMENSION;
    const maxHeight = opts?.maxHeight ?? exports.IMAGE_MAX_DIMENSION;
    return orig.width > maxWidth || orig.height > maxHeight;
}
/**
 * 质量归一化：两端接受 0-1 或 0-100 两种表示。
 * 输入 > 1 视为百分比，归一到 0-1；结果 clamp 到 [0.1, 1.0]。
 */
function normalizeQuality(input) {
    let q = input;
    if (q > 1)
        q = q / 100;
    if (Number.isNaN(q))
        return exports.IMAGE_JPEG_QUALITY;
    return Math.min(1, Math.max(0.1, q));
}
/**
 * 把 0-1 质量转小程序 canvasToTempFilePath 的 0-100 表示（整数）。
 */
function qualityToPercent(q) {
    return Math.round(normalizeQuality(q) * 100);
}
/** 判断文件是否需要基于大小跳过压缩（纯启发式） */
function shouldSkipCompressByFileSize(byteLength) {
    return byteLength > 0 && byteLength < exports.IMAGE_SKIP_COMPRESS_BYTES;
}
//# sourceMappingURL=image-spec.js.map