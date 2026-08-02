import fs from 'node:fs'

const qa = 'D:/workspae/gitee/techer/work-system/qa'
const v1 = JSON.parse(fs.readFileSync(qa + '/functional-report.json', 'utf8'))
const v2 = JSON.parse(fs.readFileSync(qa + '/functional-report-v2.json', 'utf8'))
const perf = JSON.parse(fs.readFileSync(qa + '/performance-report.json', 'utf8'))

console.log('v1 summary:', JSON.stringify(v1.summary))
console.log('v2 summary:', JSON.stringify(v2.summary))
console.log('perf summary:', JSON.stringify(perf.summary || perf))
console.log('\nv2 groups:')
const groups = {}
for (const r of v2.results) groups[r.group] = (groups[r.group] || 0) + 1
for (const [g, n] of Object.entries(groups)) console.log(`  ${g}: ${n}`)
console.log('\nperf scenes:')
for (const r of perf.results || []) console.log(`  ${r.label}: rps=${r.rps} avg=${r.avg}ms p95=${r.p95} err=${r.errorRate}`)
