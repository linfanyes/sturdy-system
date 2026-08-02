// 调试：正则匹配测试
import fs from 'node:fs'
const log = fs.readFileSync('server/qa-server.log', 'utf8')
const line = log.split('\n').find(l => l.includes('Mapped {/api/health'))
console.log('LINE:', JSON.stringify(line))
const re = /Mapped \{(\/[^,]+), (GET|POST|PATCH|PUT|DELETE)\} route/g
const m = re.exec(line)
console.log('MATCH:', m && [m[1], m[2]])
const re2 = /Mapped \{([^}]+)\} route/g
const m2 = re2.exec(line)
console.log('MATCH2:', m2 && m2[1])
