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
/** 默认长边上限（像素） */
export declare const IMAGE_MAX_DIMENSION = 1280;
/** 默认 JPEG 质量（0-1 区间） */
export declare const IMAGE_JPEG_QUALITY = 0.8;
/** 默认质量（0-100 区间，兼容小程序端习惯表示） */
export declare const IMAGE_JPEG_QUALITY_PERCENT = 80;
/** 小于此字节数的文件跳过压缩（避免无意义重编码） */
export declare const IMAGE_SKIP_COMPRESS_BYTES: number;
/** 输出格式 */
export declare const IMAGE_OUTPUT_FORMAT: "image/jpeg";
export interface ImageDimensions {
    width: number;
    height: number;
}
export interface ComputeScaledOptions {
    /** 最大宽度（像素），默认 IMAGE_MAX_DIMENSION */
    maxWidth?: number;
    /** 最大高度（像素），默认 IMAGE_MAX_DIMENSION */
    maxHeight?: number;
    /** 是否允许放大（默认 false：只缩小、不放大） */
    allowUpscale?: boolean;
}
/**
 * 根据原始尺寸计算缩放后的尺寸（保持宽高比）。
 * 纯计算，无平台 I/O。
 */
export declare function computeScaledDimensions(orig: ImageDimensions, opts?: ComputeScaledOptions): ImageDimensions;
/** 判断图片是否需要压缩（基于尺寸是否超限） */
export declare function shouldCompressBySize(orig: ImageDimensions, opts?: Pick<ComputeScaledOptions, 'maxWidth' | 'maxHeight'>): boolean;
/**
 * 质量归一化：两端接受 0-1 或 0-100 两种表示。
 * 输入 > 1 视为百分比，归一到 0-1；结果 clamp 到 [0.1, 1.0]。
 */
export declare function normalizeQuality(input: number): number;
/**
 * 把 0-1 质量转小程序 canvasToTempFilePath 的 0-100 表示（整数）。
 */
export declare function qualityToPercent(q: number): number;
/** 判断文件是否需要基于大小跳过压缩（纯启发式） */
export declare function shouldSkipCompressByFileSize(byteLength: number): boolean;
//# sourceMappingURL=image-spec.d.ts.map