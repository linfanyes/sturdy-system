// 调试3：编码探测
import fs from 'node:fs'
const buf = fs.readFileSync('server/qa-server.log')
console.log('BOM:', buf.slice(0, 4))
const utf16 = buf.toString('utf16le')
console.log('UTF16 HAS Mapped:', utf16.includes('Mapped'))
const idx = utf16.indexOf('Mapped {/api/health')
console.log('IDX:', idx)
if (idx >= 0) console.log('SNIPPET:', JSON.stringify(utf16.slice(idx, idx + 60)))
