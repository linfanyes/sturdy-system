// 零依赖静态文件服务器（带 SPA 回退）
// CI 里不想为了"托管一个 dist 目录"再引入额外依赖，直接用 node 内置模块。
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
}

/**
 * 启动静态服务器
 * @param {string} root 站点根目录
 * @param {number} port 端口（0 = 随机可用端口）
 * @returns {Promise<{ url: string, port: number, close: () => Promise<void> }>}
 */
export function serveStatic(root, port = 0) {
  const absRoot = path.resolve(root)
  if (!fs.existsSync(path.join(absRoot, 'index.html'))) {
    throw new Error(`静态目录缺少 index.html: ${absRoot}`)
  }

  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
      let filePath = path.join(absRoot, urlPath)
      // 目录穿越防护
      if (!filePath.startsWith(absRoot)) {
        res.writeHead(403).end('Forbidden')
        return
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html')
      }
      // SPA 回退：hash 路由下静态资源之外的路径一律返回入口页
      if (!fs.existsSync(filePath)) filePath = path.join(absRoot, 'index.html')

      const ext = path.extname(filePath).toLowerCase()
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      })
      fs.createReadStream(filePath).pipe(res)
    } catch (e) {
      res.writeHead(500).end(String(e))
    }
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      const actual = server.address().port
      resolve({
        url: `http://127.0.0.1:${actual}`,
        port: actual,
        close: () => new Promise((r) => server.close(() => r())),
      })
    })
  })
}

// 允许直接命令行启动：node lib/static-server.mjs <dir> [port]
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2] || '.'
  const port = Number(process.argv[3]) || 5000
  serveStatic(dir, port).then((s) => console.log(`静态服务已启动: ${s.url} -> ${path.resolve(dir)}`))
}
