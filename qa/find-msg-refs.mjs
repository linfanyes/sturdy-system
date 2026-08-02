import fs from 'node:fs'
import path from 'node:path'

const root = 'D:/workspae/gitee/techer/work-system/mini-program'
const files = []
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f)
    const s = fs.statSync(p)
    if (s.isDirectory()) walk(p)
    else if (/\.(js|vue|ts)$/.test(f)) files.push(p)
  }
}
walk(root)
for (const f of files) {
  try {
    const c = fs.readFileSync(f, 'utf8')
    if (/recipient|messages/.test(c)) {
      const lines = c.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (/recipient/.test(lines[i])) {
          console.log(f.replace(root, '') + ':' + (i + 1) + ' ' + lines[i].trim().slice(0, 120))
        }
      }
    }
  } catch (e) {}
}
