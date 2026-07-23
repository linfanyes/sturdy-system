import 'reflect-metadata'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'
import { CrudService } from '../src/common/crud/base.service'

/**
 * 系统安全相关逻辑测试。
 *
 * 对于可访问的模块（base.service.ts 的 CrudService）直接实例化做行为测试；
 * 对于非导出的内部常量/方法（UNSAFE_KEYS、TEACHER_ID_TABLES、deleteSchoolNotice 等）
 * 读取源文件内容，用正则/字符串匹配验证安全属性。
 */

const SERVER_ROOT = path.resolve(__dirname, '..')
function readSrc(rel: string): string {
  return fs.readFileSync(path.resolve(SERVER_ROOT, rel), 'utf8')
}

const authServiceSrc = readSrc('src/auth/auth.service.ts')
const baseControllerSrc = readSrc('src/common/crud/base.controller.ts')
const schoolAdminSrc = readSrc('src/school-admin/school-admin.service.ts')

describe('系统安全相关逻辑', () => {
  describe('密码哈希', () => {
    it('1. sha256 哈希不等于明文', () => {
      const plain = '123456'
      const hash = crypto.createHash('sha256').update(plain).digest('hex')
      expect(hash).not.toBe(plain)
      expect(hash).toHaveLength(64)
      // 源码使用 sha256 哈希
      expect(authServiceSrc).toMatch(/createHash\(['"]sha256['"]\)/)
    })
  })

  describe('JWT payload', () => {
    it('2. 教师 token 必须包含 schoolId 字段', () => {
      // 提取所有 role: 'teacher' 的 jwt.sign 调用（payload 为单行扁平对象）
      const re = /this\.jwt\.sign\(\{[^}]*role: 'teacher'[^}]*\}\)/g
      const calls = authServiceSrc.match(re) || []
      expect(calls.length).toBeGreaterThan(0)
      for (const c of calls) {
        expect(c).toContain('schoolId')
      }
    })
  })

  describe('数据隔离', () => {
    it('3. base.service.ts 的 findAll 按 teacherId 过滤', async () => {
      let captured: any
      const repo: any = {
        findAndCount: jest.fn(async (opts: any) => {
          captured = opts
          return [[], 0]
        }),
      }
      const svc = new CrudService<any>(repo)
      await svc.findAll('teacher-001', undefined, 0, 500)
      expect(repo.findAndCount).toHaveBeenCalledTimes(1)
      expect(captured.where).toEqual({ teacherId: 'teacher-001' })
    })

    it('4. base.service.ts 的 findOne 按 teacherId + id 过滤', async () => {
      let captured: any
      const repo: any = {
        findOne: jest.fn(async (opts: any) => {
          captured = opts
          return { id: 'r1', teacherId: 'teacher-001' }
        }),
      }
      const svc = new CrudService<any>(repo)
      await svc.findOne('r1', 'teacher-001')
      expect(repo.findOne).toHaveBeenCalledTimes(1)
      expect(captured.where).toEqual({ id: 'r1', teacherId: 'teacher-001' })
    })
  })

  describe('stripUnsafe', () => {
    it('5. 剔除客户端传入的 teacherId 字段', () => {
      // UNSAFE_KEYS 集合中包含 teacherId
      const m = baseControllerSrc.match(
        /UNSAFE_KEYS = new Set\(\[([\s\S]*?)\]\)/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toContain("'teacherId'")
      // stripUnsafe 在 create/update 写操作中被调用
      expect(baseControllerSrc).toMatch(/create\([\s\S]*?stripUnsafe\(dto\)/)
      expect(baseControllerSrc).toMatch(/update\([\s\S]*?stripUnsafe\(dto\)/)
    })
  })

  describe('级联删除补全', () => {
    it('6. TEACHER_ID_TABLES 包含 notices/lesson_observations/work_logs', () => {
      const m = schoolAdminSrc.match(
        /const TEACHER_ID_TABLES = \[([\s\S]*?)\]/,
      )
      expect(m).not.toBeNull()
      // eslint-disable-next-line no-new-func
      const tables = new Function('return [' + m![1] + ']')() as string[]
      expect(tables).toContain('notices')
      expect(tables).toContain('lesson_observations')
      expect(tables).toContain('work_logs')
    })
  })

  describe('家长默认密码', () => {
    it('7. 家长默认密码为 "123456"（非空）', () => {
      const m = authServiceSrc.match(/PARENT_DEFAULT_PASSWORD\s*=\s*'([^']*)'/)
      expect(m).not.toBeNull()
      expect(m![1]).not.toBe('')
      expect(m![1]).toBe('123456')
    })
  })

  describe('越权修复', () => {
    it('8. deleteSchoolNotice 校验 schoolId', () => {
      // 提取 deleteSchoolNotice 方法体
      const m = schoolAdminSrc.match(
        /async deleteSchoolNotice\(schoolId[^{]*\{([\s\S]*?)\r?\n  \}/,
      )
      expect(m).not.toBeNull()
      const body = m![1]
      // 必须以 schoolId 作为查询条件之一
      expect(body).toMatch(/schoolId/)
      // 必须在校验失败时抛出异常（无权操作）
      expect(body).toMatch(/无权操作此公告/)
    })
  })
})
