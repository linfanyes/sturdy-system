/**
 * QA 执行入口：启动内存库服务 → 灌入测试数据集 → 执行功能/边界/性能/导航用例 → 输出结果 JSON
 * 用法：npm run qa   （等价 tsc -p tsconfig.qa.json && node .qa-dist/qa/run.js）
 */
// QA_MODE 必须先于任何实体 import 设置（实体按此选择 SQLite 兼容列类型）
process.env.QA_MODE = '1'
process.env.NODE_ENV = 'qa'
// 放宽登录限流（控制器模块加载时即读取），避免压测被防暴力破解守卫拦截
process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '100000'
process.env.WECHAT_RATE_LIMIT_MAX = process.env.WECHAT_RATE_LIMIT_MAX || '100000'

import { startQaApp } from './harness'
import { seedDataset } from './seed'
import { registerFunctionalCases } from './functional'
import { registerEdgeCases } from './edge'
import { registerPerfCases } from './performance'
import { registerNavigationCases } from './navigation'
import { runAll, summarize } from './framework'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  const t0 = Date.now()
  const qa = await startQaApp(+(process.env.QA_PORT || 3199))

  // eslint-disable-next-line no-console
  console.log('[qa] 开始灌入测试数据集（20 校 × 48 班 × 60 生 × 6 师 + 3 学期 × 30 考试 + 富化数据）…')
  const seed = await seedDataset(qa.baseUrl, qa.dataSource)
  // eslint-disable-next-line no-console
  console.log(`[qa] 数据集就绪：学生 ${seed.studentCount} / 考试 ${seed.examCount} / 成绩记录 ${seed.gradeRowCount}，公告 ${seed.noticeCount} / 消息 ${seed.messageCount} / 笔记 ${seed.noteCount} / 通知 ${seed.notificationCount}，耗时 ${seed.durationMs}ms`)

  registerFunctionalCases(qa.baseUrl, seed)
  registerEdgeCases(qa.baseUrl, seed)
  registerPerfCases(qa.baseUrl, seed)
  registerNavigationCases(qa.baseUrl, seed)

  // eslint-disable-next-line no-console
  console.log('[qa] 执行功能/边界/导航用例…')
  const { functional, performance } = await runAll()
  const summary = summarize(functional, performance)

  const outDir = path.resolve(__dirname, '..', '..', '..', 'qa')
  fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, 'server-results.json')
  fs.writeFileSync(outFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    dataset: {
      schools: seed.schools.length,
      students: seed.studentCount,
      exams: seed.examCount,
      gradeRows: seed.gradeRowCount,
      notices: seed.noticeCount,
      messages: seed.messageCount,
      notes: seed.noteCount,
      notifications: seed.notificationCount,
      multiChildFamilies: seed.multiChildFamilies?.length || 0,
      teacherAsParent: seed.teacherAsParent?.length || 0,
      seedDurationMs: seed.durationMs,
    },
    summary,
    functional,
    performance,
    totalDurationMs: Date.now() - t0,
  }, null, 2))

  // eslint-disable-next-line no-console
  console.log(`[qa] 功能+边界+导航: ${summary.functional.pass}/${summary.functional.total} 通过；性能: ${summary.performance.pass}/${summary.performance.total} 通过`)
  // eslint-disable-next-line no-console
  console.log(`[qa] 结果已写入 ${outFile}`)

  await qa.close()
  // 存在失败用例时以非零码退出（供 CI/脚本判定）
  process.exit(summary.functional.fail + summary.performance.fail > 0 ? 1 : 0)
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[qa] 执行器异常:', e)
  process.exit(2)
})