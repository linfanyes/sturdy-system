import fs from 'node:fs'

const c = fs.readFileSync('D:/workspae/gitee/techer/work-system/mini-program/src/pages/messages/messages.vue', 'utf8')
const i = c.indexOf('<script')
console.log(c.slice(i, i + 4000))
