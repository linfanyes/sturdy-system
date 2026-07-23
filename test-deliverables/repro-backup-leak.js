/**
 * 复现脚本：备份接口租户隔离越权（缺陷 D1 / CRITICAL）
 *
 * 还原 server/src/backup/backup.module.ts 控制器逻辑：
 *   - 修复前：svc.list(req.user.teacherId || req.user.id)
 *             JwtAuthGuard 把 { sub, openid } 挂到 req.user，
 *             因此 req.user.teacherId 与 req.user.id 均为 undefined。
 *   - 修复后：svc.list(req.user.sub)
 *
 * 模拟 TypeORM find：where 条件中出现 undefined 键时会被 TypeORM 丢弃，
 * 导致 WHERE teacherId 条件消失，从而返回/删除全部租户的备份（PII 越权）。
 */
const DB = [
  { id: 'b1', teacherId: 'T1', label: '王老师备份A' },
  { id: 'b2', teacherId: 'T2', label: '李老师备份B' },
  { id: 'b3', teacherId: 'T1', label: '王老师备份C' },
  { id: 'b4', teacherId: 'T3', label: '张老师备份D' },
]

function queryByTeacherId(teacherId) {
  const where = {}
  if (teacherId !== undefined) where.teacherId = teacherId
  // undefined 键被忽略 => 等价于无条件查询
  return DB.filter((r) => (where.teacherId === undefined ? true : r.teacherId === where.teacherId))
}

// 当前登录教师
const CURRENT = 'T1'

// 修复前：req.user.teacherId || req.user.id
const beforeTid = undefined // { sub: 'T1', openid: '...' } 无 teacherId/id 字段
const before = queryByTeacherId(beforeTid)

// 修复后：req.user.sub
const after = queryByTeacherId(CURRENT)

console.log('== 备份列表越权复现 ==')
console.log(`当前教师: ${CURRENT}`)
console.log(`修复前 (teacherId=undefined) 返回 ${before.length} 条 -> ${before.length === DB.length ? '❌ 越权泄露全部租户备份' : '✅ 仅自身'}`)
before.forEach((r) => console.log(`   泄露: [${r.teacherId}] ${r.label}`))
console.log(`修复后 (teacherId=T1) 返回 ${after.length} 条 -> ${after.length === 2 ? '✅ 租户隔离正确' : '❌ 隔离失效'}`)
after.forEach((r) => console.log(`   自身: [${r.teacherId}] ${r.label}`))

const leaked = before.length > after.length
console.log(`\n结论: ${leaked ? '存在跨租户越权（缺陷成立），修复后已隔离' : '未发现越权'}`)
process.exit(leaked ? 0 : 1)
