// 预加载脚本: 本应用为纯前端 SPA, 数据存于浏览器 localStorage,
// 无需向渲染进程暴露任何 Node / Electron API, 保持 contextIsolation 安全边界。
//
// 唯一暴露的标志: window.__ELECTRON_PACKAGED__
//   - Electron 打包态 (app.isPackaged === true) 时为 true
//   - Web / Vite dev / Electron 开发态 均为 false
// 用途: 让 /dev/seed 等开发路由在 Electron 打包构建中按硬约束显式启用。
//
// 实现: sandbox 模式下 preload 不能直接 require('electron').app,
// 改用 ipcRenderer.sendSync 向主进程同步查询打包状态。
const { contextBridge, ipcRenderer } = require('electron')

let isPackaged = false
try {
  isPackaged = ipcRenderer.sendSync('trace:is-packaged')
} catch {
  // 非 Electron 环境 (纯 Web) ipcRenderer 不可用, 保持 false
}

try {
  contextBridge.exposeInMainWorld('__ELECTRON_PACKAGED__', isPackaged)
} catch {
  window.addEventListener('DOMContentLoaded', () => {
    Object.defineProperty(window, '__ELECTRON_PACKAGED__', {
      value: isPackaged,
      configurable: false,
      writable: false,
    })
  })
}
