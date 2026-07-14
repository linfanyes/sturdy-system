// 预加载脚本: 本应用为纯前端 SPA, 数据存于浏览器 localStorage,
// 无需向渲染进程暴露任何 Node / Electron API, 保持 contextIsolation 安全边界。
// 此处仅作为占位与未来扩展点 (如需 safe bridge 再补充)。
window.addEventListener('DOMContentLoaded', () => {
  // 空实现
})
