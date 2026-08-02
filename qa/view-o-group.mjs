import fs from 'node:fs'
const c = fs.readFileSync('D:/workspae/gitee/techer/work-system/qa/functional-tests-v2.mjs', 'utf8')
const i = c.indexOf("const g = 'O.")
const j = c.indexOf("const g = 'P.")
console.log('O-group at', i, 'P-group at', j)
console.log(c.slice(i, j))
