/**
 * 快速 QA 运行器：使用小规模数据集验证四角色功能测试
 * 数据集：2 学校 × 2 年级 × 2 班 × 5 学生 + 2 师/班
 */
process.env.QA_MODE = '1'
process.env.NODE_ENV = 'qa'
process.env.JWT_SECRET = 'qa-test-secret-key-for-local-automation'
process.env.SUPER_ADMIN_USER = 'admin'
process.env.SUPER_ADMIN_PASSWORD = '$2b$10$dSL8FcGzMZRSMSQW0WEOX.eXKAPjB9Y0tsYK4c9P8UW1YBCbAYwzm'
process.env.LOGIN_RATE_LIMIT_MAX = '100000'
process.env.WECHAT_RATE_LIMIT_MAX = '100000'

import { startQaApp } from './harness'
import { seedDataset } from './seed'
import { registerTeacherFunctionalCases } from './teacher-functional'
import { registerSchoolAdminCases } from './schooladmin-functional'
import { registerSuperFunctionalCases } from './super-functional'
import { registerParentFunctionalCases } from './parent-functional'
import { runAll, summarize } from './framework'

// 覆盖为轻量数据集
process.env.QA_SCHOOL_COUNT = '2'
process.env.QA_GRADES_PER_SCHOOL = '2'
process.env.QA_CLASSES_PER_GRADE = '2'
process.env.QA_STUDENTS_PER_CLASS = '5'
process.env.QA_TEACHERS_PER_CLASS = '2'

async function main() {
  const t0 = Date.now()
  const qa = await startQaApp(+(process.env.QA_PORT || 3200))

  // eslint-disable-next-line no-console
  console.log('[quick-qa] 开始灌入轻量测试数据集（2 校 × 4 班 × 5 生 × 2 师）…')
  const seed = await seedDataset(qa.baseUrl, qa.dataSource)
  // eslint-disable-next-line no-console
  console.log(`[quick-qa] 数据集就绪：学生 ${seed.studentCount} / 考试 ${seed.examCount}，耗时 ${seed.durationMs}ms`)

  registerTeacherFunctionalCases(qa.baseUrl, seed)
  registerSchoolAdminCases(qa.baseUrl, seed)
  registerSuperFunctionalCases(qa.baseUrl, seed)
  registerParentFunctionalCases(qa.baseUrl, seed)

  // eslint-disable-next-line no-console
  console.log('[quick-qa] 执行四角色功能用例…')
  const { functional } = await runAll()
  const summary = summarize(functional, [])

  // eslint-disable-next-line no-console
  console.log(`\n[quick-qa] 功能测试结果: ${summary.functional.pass}/${summary.functional.total} 通过`)

  // 按模块统计
  const byModule: Record<string, { pass: number; fail: number; total: number }> = {}
  for (const c of functional) {
    const m = c.module.split('-')[1] || c.module
    if (!byModule[m]) byModule[m] = { pass: 0, fail: 0, total: 0 }
    byModule[m].total++
    if (c.status === 'pass') byModule[m].pass++
    else byModule[m].fail++
  }
  // eslint-disable-next-line no-console
  console.log('\n按模块统计：')
  for (const [mod, stat] of Object.entries(byModule)) {
    // eslint-disable-next-line no-console
    console.log(`  ${mod}: ${stat.pass}/${stat.total} 通过`)
  }

  // 打印失败用例
  const failures = functional.filter(c => c.status === 'fail')
  if (failures.length > 0) {
    // eslint-disable-next-line no-console
    console.log('\n失败用例详情：')
    for (const f of failures.slice(0, 30)) {
      // eslint-disable-next-line no-console
      console.log(`  ❌ ${f.id} [${f.module}] ${f.name}`)
      // eslint-disable-next-line no-console
      console.log(`     ${f.error?.substring(0, 200) || 'unknown error'}`)
    }
    if (failures.length > 30) {
      // eslint-disable-next-line no-console
      console.log(`  ... 还有 ${failures.length - 30} 个失败用例`)
    }
  }

  // eslint-disable-next-line no-console
  console.log(`\n[quick-qa] 总耗时 ${Date.now() - t0}ms`)

  await qa.close()
  process.exit(summary.functional.fail > 0 ? 1 : 0)
}

main().catch(e => {
  console.error('[quick-qa] 执行异常:', e)
  process.exit(2)
})
