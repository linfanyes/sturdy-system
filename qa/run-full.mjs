// 园丁工作台 · QA 全量回归统一入口
// 用法: node qa/run-full.mjs [--skip-seed] [--skip-perf]
// 流程: seed → v1 功能基线 → v2 功能扩展 → 性能压测（可选）
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const skipSeed = args.includes('--skip-seed')
const skipPerf = args.includes('--skip-perf')

const steps = [
  ...(skipSeed ? [] : [['seed-data.mjs', '🌱 种子数据']]),
  ['functional-tests.mjs', '🧪 v1 功能基线 (75)'],
  ['functional-tests-v2.mjs', '🧪 v2 功能扩展 (81)'],
  ...(skipPerf ? [] : [['performance-tests.mjs', '⚡ 性能压测 (13 场景)']]),
]

function run(script, label) {
  return new Promise((resolve) => {
    console.log(`\n========== ${label} ==========`)
    const child = spawn(process.execPath, [path.join(__dirname, script)], {
      stdio: 'inherit',
      env: { ...process.env },
    })
    child.on('exit', (code) => resolve(code))
  })
}

;(async () => {
  const start = Date.now()
  let failed = 0
  for (const [script, label] of steps) {
    const code = await run(script, label)
    if (code !== 0) {
      failed++
      console.error(`❌ ${script} 退出码 ${code}`)
    }
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n========== QA 全量回归完成 ==========`)
  console.log(`耗时 ${elapsed}s | ${steps.length - failed}/${steps.length} 步骤通过`)
  process.exit(failed ? 1 : 0)
})()
