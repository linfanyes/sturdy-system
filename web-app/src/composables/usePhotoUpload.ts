/**
 * 照片上传辅助：读取本地图片 → 压缩 → base64 dataURL。
 *
 * 【复用改造】压缩默认参数（长边 1280px / 质量 0.8）与纯缩放计算已委托给
 * shared/utils/image-spec.ts；本文件仅保留 Web 平台 I/O（FileReader + Canvas + toDataURL）。
 * 与小程序端 mini-program/src/common/image.js 共用同一份压缩策略。
 */

import {
  IMAGE_MAX_DIMENSION,
  IMAGE_JPEG_QUALITY,
  IMAGE_SKIP_COMPRESS_BYTES,
  IMAGE_OUTPUT_FORMAT,
  computeScaledDimensions,
  shouldSkipCompressByFileSize,
} from '@gardener/shared/utils/image-spec'

/** 读取文件为 base64 dataURL（不压缩） */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

/**
 * 压缩图片并返回 base64 dataURL。
 * @param file 原始文件
 * @param maxWidth 最大宽度（默认 IMAGE_MAX_DIMENSION=1280，与小程序一致）
 * @param quality JPEG 质量 0-1（默认 IMAGE_JPEG_QUALITY=0.8）
 */
export async function compressImage(
  file: File,
  maxWidth: number = IMAGE_MAX_DIMENSION,
  quality: number = IMAGE_JPEG_QUALITY,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('仅支持图片文件')
  }
  const dataUrl = await readFileAsDataURL(file)
  // 小文件跳过（避免无意义重编码）
  if (shouldSkipCompressByFileSize(file.size)) return dataUrl
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const { width, height } = computeScaledDimensions(
        { width: img.width, height: img.height },
        { maxWidth, maxHeight: maxWidth },
      )
      if (width === img.width && height === img.height) {
        // 无需缩放，直接返回原图
        return resolve(dataUrl)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(dataUrl)
      ctx.drawImage(img, 0, 0, width, height)
      try {
        resolve(canvas.toDataURL(IMAGE_OUTPUT_FORMAT, quality))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = dataUrl
  })
}

/** 批量压缩多张图片 */
export async function compressImages(files: File[], onProgress?: (done: number, total: number) => void) {
  const results: string[] = []
  for (let i = 0; i < files.length; i++) {
    try {
      const dataUrl = await compressImage(files[i])
      results.push(dataUrl)
    } catch {
      /* 跳过失败的图片 */
    }
    onProgress?.(i + 1, files.length)
  }
  return results
}
