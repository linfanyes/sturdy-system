/**
 * 照片上传辅助：读取本地图片 → 压缩 → base64 dataURL。
 * 与小程序端压缩策略一致（1280px 宽，70% 质量），控制 payload 体积。
 */

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
 * @param maxWidth 最大宽度（默认 1280，与小程序一致）
 * @param quality JPEG 质量 0-1（默认 0.7）
 */
export async function compressImage(
  file: File,
  maxWidth = 1280,
  quality = 0.7,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('仅支持图片文件')
  }
  const dataUrl = await readFileAsDataURL(file)
  // 非 jpeg/png 或小图直接返回
  if (file.size < 200 * 1024) return dataUrl
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(dataUrl)
      ctx.drawImage(img, 0, 0, width, height)
      try {
        resolve(canvas.toDataURL('image/jpeg', quality))
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
