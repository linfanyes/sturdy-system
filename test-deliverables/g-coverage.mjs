import { readFileSync } from 'fs'
import { getMockData, hasKnownMock } from '../mini-program/src/common/mock-data.js'

const raw = readFileSync(new URL('../test-deliverables/fe-paths.txt', import.meta.url), 'utf8')
  .split('\n').map((s) => s.trim()).filter(Boolean)

// 确保以 / 开头，去除尾部斜杠与子动作
function norm(p) {
  if (!p.startsWith('/')) p = '/' + p
  p = p.replace(/\/+$/, '')
  return p
}

const uncovered = []
const covered = []
for (const p of raw) {
  const n = norm(p)
  // 集合路由：/x/yyy（ID）或 /x/sub-action
  let key = n
  // 尝试逐步缩短到已知 mock 键
  let found = false
  let probe = n
  while (probe.length > 1) {
    if (hasKnownMock(probe)) { found = true; break }
    const idx = probe.lastIndexOf('/')
    if (idx <= 0) break
    probe = probe.slice(0, idx)
  }
  // 动态子资源如 /students/s1 → /students 已在 MOCK
  if (found) { covered.push(n); continue }
  // POST 类子动作若未命中，getMockData 会兜底返回成功对象（不会崩），仅标记提示
  uncovered.push(n)
}

console.log('已覆盖路由数:', covered.length)
console.log('未命中 MOCK 的路由 (演示模式可能空白/走兜底):')
console.log(uncovered.join('\n'))
process.exit(0)
