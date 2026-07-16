const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

// 打包后 app.isPackaged 为 true, 加载本地 dist; 开发态可指向 vite dev server
const isDev = !app.isPackaged

// 暴露打包状态给渲染进程, 供 /dev/seed 等开发路由按硬约束在 Electron 打包态显式启用
// sandbox 模式下 preload 无法直接读取 app.isPackaged, 通过同步 IPC 查询
ipcMain.on('trace:is-packaged', (event) => {
  event.returnValue = !!app.isPackaged
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: '园丁工作台',
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5201')
  } else {
    // dist 与 electron 主进程同处打包目录, 用相对路径加载
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.on('closed', () => {
    // 允许 GC
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
