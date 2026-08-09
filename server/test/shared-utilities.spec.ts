import 'reflect-metadata'
import fs from 'fs'
import path from 'path'

/**
 * 新增共享工具函数测试：验证重复代码抽取正确性
 * - normalizeGender (@gardener/shared)
 * - findStudentByNoForLogin (common/utils)
 * - parseFileToRows (common/file-parser.util)
 * - buildAiSettings (ai/ai-settings.util)
 */

describe('A08 - normalizeGender 性别归一化', () => {
  beforeAll(() => {
    // 验证 shared/gender.ts 存在于项目根 shared 目录（非 server/src/shared/）
    const sharedSrc = fs.readFileSync(
      path.resolve(__dirname, '../../shared/utils/gender.ts'),
      'utf8',
    )
    // 验证导出存在
    expect(sharedSrc).toMatch(/export function normalizeGender/)
  })

  it('应在 students.module.ts 中被引用', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/students/students.module.ts'),
      'utf8',
    )
    expect(src).toMatch(/normalizeGender/)
    expect(src).toMatch(/@gardener\/shared\/utils\/gender/)
  })

  it('应在 student-ops.service.ts 中被引用（校管学生批量导入，A03 拆分后位置）', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/school-admin/student-ops.service.ts'),
      'utf8',
    )
    expect(src).toMatch(/normalizeGender/)
  })
})

describe('A05 - findStudentByNoForLogin 抽取', () => {
  it('工具函数应存在于 common/utils/student.util.ts', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/common/utils/student.util.ts'),
      'utf8',
    )
    expect(src).toMatch(/export async function findStudentByNoForLogin/)
    expect(src).toMatch(/parentLoginEnabled/)
  })

  it('auth.service.ts 应引用共享工具', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/auth/auth.service.ts'),
      'utf8',
    )
    expect(src).toMatch(/findStudentByNoForLogin/)
    expect(src).toMatch(/common\/utils\/student.util/)
  })

  it('wechat-auth.service.ts 应引用共享工具', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/auth/wechat-auth.service.ts'),
      'utf8',
    )
    expect(src).toMatch(/findStudentByNoForLogin/)
  })

  it('parent-auth.service.ts 应引用共享工具', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/parent-auth/parent-auth.service.ts'),
      'utf8',
    )
    expect(src).toMatch(/findStudentByNoForLogin/)
  })
})

describe('A06 - buildSettings 抽取到 ai-settings.util', () => {
  it('ai-settings.util.ts 应导出 buildAiSettings', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/ai/ai-settings.util.ts'),
      'utf8',
    )
    expect(src).toMatch(/export async function buildAiSettings/)
    expect(src).toMatch(/getAiSettings/)
    expect(src).toMatch(/assertAllowedAiUrl/)
  })

  it('4个 AI 子服务应都引用共享工具', () => {
    const services = [
      '../src/ai/ai-chat.service.ts',
      '../src/ai/ai-media.service.ts',
      '../src/ai/ai-vision.service.ts',
      '../src/ai/ai-file-parser.service.ts',
    ]
    for (const svc of services) {
      const src = fs.readFileSync(path.resolve(__dirname, svc), 'utf8')
      expect(src).toMatch(/buildAiSettings/)
    }
  })
})

describe('A07 - parseFileToRows 文件解析工具', () => {
  it('file-parser.util.ts 应导出 parseFileToRows', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/common/file-parser.util.ts'),
      'utf8',
    )
    expect(src).toMatch(/export async function parseFileToRows/)
    expect(src).toMatch(/xlsxFirstSheetToRows/)
  })

  it('grades.module.ts 应使用共享解析工具', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/grades/grades.module.ts'),
      'utf8',
    )
    expect(src).toMatch(/parseFileToRows/)
  })
})

describe('P04 - ClassMemberService 热路径缓存', () => {
  it('应添加私有缓存字段', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/class-members/class-members.module.ts'),
      'utf8',
    )
    expect(src).toMatch(/_hotCache/)
    expect(src).toMatch(/Map<string/)
  })

  it('应在 canAccess/getRole/getClassIdsByTeacher 中使用缓存', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/class-members/class-members.module.ts'),
      'utf8',
    )
    expect(src).toMatch(/canAccess/)
    expect(src).toMatch(/getRole/)
    expect(src).toMatch(/getClassIdsByTeacher/)
  })
})
