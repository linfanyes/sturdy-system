// 调试2：文件读取
import fs from 'node:fs'
const log = fs.readFileSync('server/qa-server.log', 'utf8')
console.log('LEN:', log.length)
console.log('HAS Mapped:', log.includes('Mapped'))
console.log('HAS health:', log.includes('health'))
const idx = log.indexOf('Mapped {/api/health')
console.log('IDX:', idx)
if (idx >= 0) console.log('SNIPPET:', JSON.stringify(log.slice(idx, idx + 80)))
