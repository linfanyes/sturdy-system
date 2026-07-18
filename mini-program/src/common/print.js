// 小程序无 window.print，用「生成图片保存到相册」作为打印替代方案。
// 同时提供复制文本（最稳妥）。canvas 失败自动降级为复制文本。

function getDpr() {
  try { return uni.getSystemInfoSync().pixelRatio || 2 } catch (e) { return 2 }
}

// lines: string[]，title 可选
export function drawAndSave(canvasId, lines, title) {
  return new Promise((resolve, reject) => {
    const q = uni.createSelectorQuery()
    q.select('#' + canvasId).fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) { reject(new Error('canvas 未找到')); return }
      const canvas = res[0].node
      const dpr = getDpr()
      const W = 720
      const lineH = 54
      const pad = 44
      const titleH = title ? 70 : 0
      const H = pad * 2 + titleH + lines.length * lineH
      canvas.width = W * dpr
      canvas.height = H * dpr
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#1f1f1f'
      let y = pad + 30
      if (title) {
        ctx.font = 'bold 34px sans-serif'
        ctx.fillText(title, pad, y)
        ctx.font = '28px sans-serif'
        y += titleH
      }
      ctx.font = '28px sans-serif'
      lines.forEach((t) => { ctx.fillText(t, pad, y); y += lineH })
      uni.canvasToTempFilePath({
        canvas,
        success: (r) => resolve(r.tempFilePath),
        fail: (e) => reject(e),
      })
    })
  })
}

export function saveToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve(),
      fail: (e) => {
        if (/auth deny|authorize/.test(e.errMsg || '')) {
          uni.showModal({
            title: '需要相册权限',
            content: '请在设置中允许保存到相册，以便导出试卷图片打印。',
            confirmText: '去设置',
            success: (m) => { if (m.confirm) uni.openSetting() },
          })
        }
        reject(e)
      },
    })
  })
}

export function copyText(text) {
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制', icon: 'success' }) })
}
