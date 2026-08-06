/**
 * 图片压缩与统一选择工具。
 * compressImage / readImageAsBase64 — 离屏 canvas 压缩。
 * pickAndCompressImage — 统一选图+压缩入口，全局替换 uni.chooseImage / chooseMedia。
 *
 * 【复用改造】压缩参数（长边 1280、质量 80%）、缩放计算已从本文件抽出到
 * shared/utils/image-spec.ts；本文件仅保留小程序平台 I/O（uni.getImageInfo +
 * OffscreenCanvas）。与 Web 端 web-app/src/composables/usePhotoUpload.ts 共用同一份策略。
 */

import {
  IMAGE_MAX_DIMENSION,
  IMAGE_JPEG_QUALITY_PERCENT,
  computeScaledDimensions,
  qualityToPercent,
} from '@gardener/shared/utils/image-spec'

/** 图片压缩：小程序 canvas 离屏压缩，避免上传过大图片导致请求超时/质量下降 */
export function compressImage(opts) {
  const {
    src,
    maxWidth = IMAGE_MAX_DIMENSION,
    maxHeight = IMAGE_MAX_DIMENSION,
    quality = IMAGE_JPEG_QUALITY_PERCENT,
    fileType = 'jpg',
  } = opts || {}
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error('缺少 src'))
    uni.getImageInfo({
      src,
      success: (info) => {
        const { width: w, height: h } = computeScaledDimensions(
          { width: info.width, height: info.height },
          { maxWidth, maxHeight },
        )
        const canvas = wx.createOffscreenCanvas ? wx.createOffscreenCanvas({ type: '2d', width: w, height: h }) : null
        if (canvas) {
          try {
            const ctx = canvas.getContext('2d')
            const img = canvas.createImage()
            img.onload = () => {
              ctx.clearRect(0, 0, w, h)
              ctx.drawImage(img, 0, 0, w, h)
              uni.canvasToTempFilePath({
                canvas, width: w, height: h, destWidth: w, destHeight: h,
                fileType: fileType === 'png' ? 'png' : 'jpg',
                quality: qualityToPercent(quality) / 100,
                success: (r) => {
                  uni.getFileInfo({
                    filePath: r.tempFilePath,
                    success: (fi) => resolve({ tempFilePath: r.tempFilePath, size: fi.size, width: w, height: h }),
                    fail: () => resolve({ tempFilePath: r.tempFilePath, size: 0, width: w, height: h }),
                  })
                },
                fail: (e) => reject(e),
              })
            }
            img.onerror = (e) => reject(e)
            img.src = src
          } catch (e) { reject(e) }
        } else {
          resolve({ tempFilePath: src, size: 0, width: w, height: h })
        }
      },
      fail: (e) => reject(e),
    })
  })
}

/** 读图转 base64，可选先压缩 */
export async function readImageAsBase64(src, opts) {
  let path = src
  let meta = { size: 0 }
  if (opts && opts.compress !== false) {
    try {
      const r = await compressImage(opts)
      path = r.tempFilePath
      meta = r
    } catch (e) { path = src }
  }
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().readFile({
      filePath: path,
      encoding: 'base64',
      success: (r) => resolve({ base64: r.data, size: meta.size, path, width: meta.width, height: meta.height }),
      fail: reject,
    })
  })
}

/**
 * 统一选图+压缩：调用系统相册/相机，自动压缩至 1280px / 80% 质量。
 * 替代各页面零散的 uni.chooseImage / chooseMedia。
 * @param {object} opts - { count, sourceType, maxWidth, maxHeight, quality }
 * @returns {Promise<{tempFiles: Array<{tempFilePath,size,width,height}>}>}
 */
export async function pickAndCompressImage(opts = {}) {
  const {
    count = 1,
    sourceType = ['album', 'camera'],
    maxWidth = IMAGE_MAX_DIMENSION,
    maxHeight = IMAGE_MAX_DIMENSION,
    quality = IMAGE_JPEG_QUALITY_PERCENT,
  } = opts
  const res = await uni.chooseMedia({ count, mediaType: ['image'], sourceType, sizeType: ['compressed', 'original'] })
  const compressed = []
  for (const f of res.tempFiles) {
    try {
      const r = await compressImage({ src: f.tempFilePath, maxWidth, maxHeight, quality })
      compressed.push(r)
    } catch (e) {
      compressed.push({ tempFilePath: f.tempFilePath, size: f.size || 0 })
    }
  }
  return { tempFiles: compressed, count: compressed.length }
}
