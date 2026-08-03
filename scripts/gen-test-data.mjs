import { readFileSync, writeFileSync } from 'node:fs'

const root = 'D:/workspace/my-prj/tercher-work/work-system'
const tok = JSON.parse(readFileSync(root + '/scripts/mini-test-tokens.json', 'utf8'))

const t1k = Object.keys(tok.roles).find((k) => k.startsWith('teacher_qa_teacher1_'))
const t2k = Object.keys(tok.roles).find((k) => k.startsWith('teacher_qa_teacher2_'))
const data = {
  meta: {
    generatedAt: new Date().toISOString(),
    backend: 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api',
    description: '园丁工作台小程序全量测试数据：五角色账号 + 种子实体 + 边界/异常数据集。测试数据前缀 qa_mp_，执行后 teardown 清理。',
    schoolId: tok.entities.schoolId,
  },
  roles: {
    super: { username: 'admin', password: 'admin', role: 'super', token: tok.roles.super.token },
    school_admin: { username: tok.roles.school_admin.username, password: tok.roles.school_admin.password, role: 'school_admin', token: tok.roles.school_admin.token },
    teacher: { username: tok.roles[t1k].username, password: tok.roles[t1k].password, role: 'teacher', token: tok.roles[t1k].token, classId: tok.entities.classId },
    teacher2: { username: tok.roles[t2k].username, password: tok.roles[t2k].password, role: 'teacher', token: tok.roles[t2k].token },
    parent: { studentNo: tok.roles.parent.studentNo, password: '123456', role: 'parent', token: tok.roles.parent.token, studentId: tok.roles.parent.studentId },
  },
  seed: {
    schoolId: tok.entities.schoolId,
    classId: tok.entities.classId,
    teacherIds: tok.entities.teacherIds,
    studentNos: tok.entities.studentNos,
    className: '一年级1班',
    studentCount: tok.entities.studentNos?.length || 0,
  },
  boundary: {
    emptyList: { desc: 'GET 列表接口在无数据时返回 []', example: 'GET /students?classId=<空班级>' },
    notExistId: { desc: '对不存在的 ID 操作，预期 404/400 而非 500', example: 'GET /students/__not_exist_id__' },
    oversizedTake: { desc: '分页 take 超过 500 被截断防护', examples: ['GET /classes?take=9999', 'GET /students?take=100000'] },
    missingFields: { desc: '创建实体缺必填字段，预期 400', example: "POST /students { name: 'x' }" },
    aiNotConfigured: { desc: 'AI 接口在未配置密钥时应优雅返回（非 500）', example: 'POST /ai/chat' },
    networkUnreachable: { desc: '后端不可达时前端统一错误并 toast', example: '断网发起请求' },
    longField: { desc: '超长字段（如 1000 字姓名）被校验/截断或 400', example: "POST /students { name: 'x'.repeat(1000) }" },
    concurrentBind: { desc: '同一教师编号并发绑定，仅一人成功（悲观锁）', example: '并发 bind-by-number' },
  },
  notes: tok.notes,
}

writeFileSync(root + '/test-deliverables/mini-test-data.json', JSON.stringify(data, null, 2))
console.log('✅ 测试数据已生成: test-deliverables/mini-test-data.json')
console.log('   角色:', Object.keys(data.roles).join(', '))
console.log('   学生学号数:', data.seed.studentNos.length)
