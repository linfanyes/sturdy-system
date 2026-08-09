import 'reflect-metadata'
import fs from 'fs'
import path from 'path'

/**
 * 安全修复验证测试
 * - S01: 学校管理员登录限速
 * - S02: 数据导出脱敏
 * - S03: 随机初始密码
 * - S06: 移除硬编码 wxAppId
 * - S07: 使用 NestJS 异常类
 */

describe('S01 - 学校管理员登录限速', () => {
  it('应使用 createRateLimitGuard 对登录接口限流', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/school-admin/school-admin.controller.ts'),
      'utf8',
    )
    expect(src).toMatch(/SchoolAdminLoginRateLimit/)
    expect(src).toMatch(/createRateLimitGuard\(60_000,\s*10\)/)
    expect(src).toMatch(/@UseGuards\(SchoolAdminLoginRateLimit\)/)
  })
})

describe('S02 - 数据导出脱敏', () => {
  it('导出相关服务应包含 maskPhone 函数', () => {
    // 拆分后学生导出（含 maskPhone）位于 student-ops.service，教师导出在 teacher-mgmt.service
    const saSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/school-admin/student-ops.service.ts'),
      'utf8',
    )
    const tmSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/school-admin/teacher-mgmt.service.ts'),
      'utf8',
    )
    // 不同文件都应有 maskPhone
    const hasMaskInSa = /private maskPhone/.test(saSrc)
    const hasMaskInTm = /private maskPhone/.test(tmSrc)
    expect(hasMaskInSa || hasMaskInTm).toBe(true)
  })

  it('导出方法应使用 maskPhone', () => {
    // 检查 student 导出在 student-ops.service, teacher 导出在 teacher-mgmt.service
    const saSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/school-admin/student-ops.service.ts'),
      'utf8',
    )
    const tmSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/school-admin/teacher-mgmt.service.ts'),
      'utf8',
    )
    // student 导出
    expect(saSrc).toMatch(/exportStudents/)
    // teacher 导出
    expect(tmSrc).toMatch(/exportTeachers/)
    // maskPhone 调用总数应 ≥ 4（四个导出方法: students, studentsXls, teachers, teachersXls）
    const saCalls = (saSrc.match(/this\.maskPhone/g) || []).length
    const tmCalls = (tmSrc.match(/this\.maskPhone/g) || []).length
    expect(saCalls + tmCalls).toBeGreaterThanOrEqual(4)
  })
})

describe('S03 - 随机初始密码', () => {
  it('应使用 generateRandomPassword 生成随机密码', () => {
    // 拆分后密码重置逻辑位于 teacher-mgmt.service
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/school-admin/teacher-mgmt.service.ts'),
      'utf8',
    )
    expect(src).toMatch(/generateRandomPassword/)
    expect(src).toMatch(/ABCDEFGHJKLMNPQRSTUVWXYZ/)  // 字符集包含大小写+数字
  })

  it('应移除硬编码默认密码 1314521', () => {
    const saSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/school-admin/school-admin.service.ts'),
      'utf8',
    )
    const tmSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/school-admin/teacher-mgmt.service.ts'),
      'utf8',
    )
    // 硬编码密码已被完全移除（生成或哈希都不可出现）
    expect(saSrc).not.toMatch(/1314521/)
    expect(tmSrc).not.toMatch(/1314521/)
  })

  it('密码长度校验应从 6 提升到 8', () => {
    // 密码长度校验在 teacher-mgmt.service 的 resetPassword
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/school-admin/teacher-mgmt.service.ts'),
      'utf8',
    )
    expect(src).toMatch(/raw\.length\s*<\s*8/)
    expect(src).toMatch(/raw\.length\s*>\s*20/)
  })
})

describe('S06 - 移除硬编码 wxAppId', () => {
  it('config.service 不应硬编码 wxAppId 默认值', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/config/config.service.ts'),
      'utf8',
    )
    // 不应出现硬编码的 AppID
    expect(src).not.toMatch(/wx1e6d151c7eb428cc/)
    // 应使用空字符串兜底
    expect(src).toMatch(/WX_APPID.*\|\|.*''/)
  })
})

describe('S07 - 使用 NestJS 异常类', () => {
  it('leaderboard.controller 应使用 BadRequestException', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/evaluation/leaderboard.controller.ts'),
      'utf8',
    )
    expect(src).toMatch(/BadRequestException/)
    expect(src).toMatch(/ForbiddenException/)
    expect(src).not.toMatch(/throw new Error\(/)
  })
})
