import { DataSource, Not, IsNull } from 'typeorm'
import { Student } from '../students/student.entity'
import { Parent } from '../parent/parent.entity'

/**
 * 迁移脚本：将现有 students.parentOpenId 数据迁移到 parents 表 + students.parentId。
 * 幂等运行（已迁移的记录不会重复处理）。
 *
 * 运行方式：
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-parents.ts
 */
async function migrate() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 3306),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'work_system',
    entities: [Student, Parent],
    synchronize: true,  // 确保 parents 表创建
  })
  await ds.initialize()

  const studentRepo = ds.getRepository(Student)
  const parentRepo = ds.getRepository(Parent)

  // 查找所有已绑定微信的学生
  const students = await studentRepo.find({ where: { parentOpenId: Not(IsNull()) } })
  // 过滤空字符串
  const boundStudents = students.filter(s => s.parentOpenId && s.parentOpenId.length > 0)

  const groups = new Map<string, Student[]>()
  for (const s of boundStudents) {
    if (!s.parentOpenId) continue
    if (!groups.has(s.parentOpenId)) groups.set(s.parentOpenId, [])
    groups.get(s.parentOpenId)!.push(s)
  }

  let parentCount = 0
  let studentCount = 0

  for (const [openid, stus] of groups) {
    let parent = await parentRepo.findOne({ where: { openId: openid } })
    if (!parent) {
      parent = parentRepo.create({
        openId: openid,
        parentName: stus[0].parentName || '家长',
        nickName: stus[0].parentNickName || undefined,
      })
      parent = await parentRepo.save(parent)
      parentCount++
    }
    for (const s of stus) {
      if (!s.parentId) {
        s.parentId = parent.id
        await studentRepo.save(s)
        studentCount++
      }
    }
  }

  console.log(`迁移完成：${parentCount} 个���长身份，${studentCount} 条学生记录已关联`)
  await ds.destroy()
}

migrate().catch(e => { console.error(e); process.exit(1) })
