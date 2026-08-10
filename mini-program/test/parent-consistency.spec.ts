/**
 * 跨端一致性测试：家长登录学号规则 + 默认口令展示（对应缺陷修复 B 与缺陷 #1）
 */
import fs from 'fs'
import path from 'path'

const miniParentLogin = fs.readFileSync(path.resolve(__dirname, '../src/pages/parent-login/parent-login.vue'), 'utf-8')
const miniStudents = fs.readFileSync(path.resolve(__dirname, '../src/pages/students/students.vue'), 'utf-8')
const serverParentAuth = fs.readFileSync(path.resolve(__dirname, '../../server/src/parent-auth/parent-auth.service.ts'), 'utf-8')
import { isStudentNo } from '@gardener/shared/validators'

describe('家长登录学号规则跨端一致性', () => {
  it('共享校验器允许字母数字学号（2-32 位）', () => {
    expect(isStudentNo('12345')).toBe(true)
    expect(isStudentNo('S01C01N01')).toBe(true)
    expect(isStudentNo('abc123')).toBe(true)
    expect(isStudentNo('1')).toBe(false) // 过短
    expect(isStudentNo('学号中文')).toBe(false)
  })

  it('小程序家长登录页不再仅允许纯数字学号', () => {
    expect(miniParentLogin).not.toMatch(/!\/\^\\d\+\$\/\.test/)
    expect(miniParentLogin).toMatch(/\[A-Za-z0-9\]\{2,32\}/)
    // 输入框改为 text，避免字母被数字键盘过滤
    expect(miniParentLogin).toMatch(/type="text"/)
  })

  it('后端 parent-auth/login 采用共享 isStudentNo 口径', () => {
    expect(serverParentAuth).toMatch(/isStudentNo/)
    expect(serverParentAuth).not.toMatch(/!\/\^\\d\+\$\/\.test\(studentNo/)
  })
})

describe('家长默认口令展示一致性（缺陷 #1 修复）', () => {
  it('后端开启家长登录的初始口令为 123456', () => {
    const studentsModule = fs.readFileSync(path.resolve(__dirname, '../../server/src/students/students.module.ts'), 'utf-8')
    expect(studentsModule).toMatch(/initialPassword = '123456'/)
  })

  it('小程序学生列表展示与后端一致的默认口令（不再误导为学号后6位）', () => {
    expect(miniStudents).toContain('默认口令：123456')
    expect(miniStudents).not.toContain('默认口令：学号后6位')
    expect(miniStudents).toContain("return '123456'")
  })
})
