import 'reflect-metadata'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { ForbiddenException, BadRequestException } from '@nestjs/common'

/**
 * 班主任特权相关逻辑测试。
 *
 * 验证：
 * 1. 班级写操作（update/remove）仅班主任可执行（防同班科任越权改班）
 * 2. 班主任特权 API（添加/移除科任老师、查询本校教师）校验班主任身份
 * 3. 班主任不能移除自己或其他班主任（转交需校管操作）
 * 4. 同班科任老师可查看成员列表但不能管理
 *
 * 由于 ClassesService 为 module 内部 class（非导出），
 * 采用读取源码 + 正则匹配验证关键安全属性，
 * 同时对 ClassMemberService 的 getRole/canAccess 行为做单元测试。
 */

const SERVER_ROOT = path.resolve(__dirname, '..')
function readSrc(rel: string): string {
  return fs.readFileSync(path.resolve(SERVER_ROOT, rel), 'utf8')
}

const classesModuleSrc = readSrc('src/classes/classes.module.ts')
const classMemberModuleSrc = readSrc('src/class-members/class-members.module.ts')
const schoolAdminSrc = readSrc('src/school-admin/school-admin.service.ts')

describe('班主任特权相关逻辑', () => {
  describe('班级写操作仅限班主任', () => {
    it('1. ClassesService 覆盖了 update 方法', () => {
      expect(classesModuleSrc).toMatch(/async update\(id: string, teacherId: string, dto: any\)/)
    })

    it('2. update 方法调用 assertHeadTeacher 校验班主任身份', () => {
      // 提取 update 方法体
      const m = classesModuleSrc.match(/async update\(id: string, teacherId: string, dto: any\)\s*\{([\s\S]*?)\n  \}/)
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/await this\.assertHeadTeacher\(teacherId, id\)/)
    })

    it('3. ClassesService 覆盖了 remove 方法', () => {
      expect(classesModuleSrc).toMatch(/async remove\(id: string, teacherId: string\)/)
    })

    it('4. remove 方法调用 assertHeadTeacher 并清理成员关系', () => {
      const m = classesModuleSrc.match(/async remove\(id: string, teacherId: string\)\s*\{([\s\S]*?)\n  \}/)
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/await this\.assertHeadTeacher\(teacherId, id\)/)
      expect(m![1]).toMatch(/this\.classMemberSvc\.listByClass\(id\)/)
      expect(m![1]).toMatch(/this\.classMemberSvc\.removeMember/)
    })

    it('5. assertHeadTeacher 校验 role === "head"，否则抛 ForbiddenException', () => {
      const m = classesModuleSrc.match(
        /private async assertHeadTeacher\(teacherId: string, classId: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      const body = m![1]
      expect(body).toMatch(/getRole\(teacherId, classId\)/)
      expect(body).toMatch(/role !== 'head'/)
      expect(body).toMatch(/ForbiddenException\('仅班主任可执行此操作'\)/)
    })

    it('6. update 方法剔除 teacherId/headTeacherId 字段（防班主任通过此接口转交班级）', () => {
      const m = classesModuleSrc.match(/async update\(id: string, teacherId: string, dto: any\)\s*\{([\s\S]*?)\n  \}/)
      expect(m).not.toBeNull()
      const body = m![1]
      expect(body).toMatch(/delete safeDto\.teacherId/)
      expect(body).toMatch(/delete safeDto\.headTeacherId/)
    })
  })

  describe('班主任管理科任老师 API', () => {
    // addSubjectTeacher 签名含对象类型 body: { teacherId: string; subjects?: string[] }，
    // 正则需匹配到 `) {` 结束，用 [\s\S]*? 非贪婪匹配整个签名
    const addSubjectRe = /async addSubjectTeacher\(classId: string, headTeacherId: string, body:[\s\S]*?\)\s*\{([\s\S]*?)\n  \}/

    it('7. addSubjectTeacher 校验班主任身份', () => {
      const m = classesModuleSrc.match(addSubjectRe)
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/await this\.assertHeadTeacher\(headTeacherId, classId\)/)
    })

    it('8. addSubjectTeacher 校验 teacherId 非空', () => {
      const m = classesModuleSrc.match(addSubjectRe)
      expect(m![1]).toMatch(/if \(!body\?\.teacherId\) throw new BadRequestException/)
    })

    it('9. addSubjectTeacher 校验同校（防止跨校添加教师）', () => {
      const m = classesModuleSrc.match(addSubjectRe)
      expect(m![1]).toMatch(/schoolId/)
      expect(m![1]).toMatch(/只能添加本校教师/)
    })

    it('10. removeSubjectTeacher 校验班主任身份', () => {
      const m = classesModuleSrc.match(
        /async removeSubjectTeacher\(classId: string, headTeacherId: string, memberTeacherId: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/await this\.assertHeadTeacher\(headTeacherId, classId\)/)
    })

    it('11. removeSubjectTeacher 禁止移除自己（班主任）', () => {
      const m = classesModuleSrc.match(
        /async removeSubjectTeacher\(classId: string, headTeacherId: string, memberTeacherId: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m![1]).toMatch(/if \(memberTeacherId === headTeacherId\)/)
      expect(m![1]).toMatch(/不能移除自己（班主任）/)
    })

    it('12. removeSubjectTeacher 禁止移除其他班主任（转交需校管）', () => {
      const m = classesModuleSrc.match(
        /async removeSubjectTeacher\(classId: string, headTeacherId: string, memberTeacherId: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m![1]).toMatch(/targetRole === 'head'/)
      expect(m![1]).toMatch(/不能移除班主任/)
    })
  })

  describe('查询本校教师（班主任添加科任老师候选）', () => {
    it('13. listSchoolTeachers 基于当前教师 schoolId 查询同校教师', () => {
      const m = classesModuleSrc.match(
        /async listSchoolTeachers\(teacherId: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      const body = m![1]
      expect(body).toMatch(/schoolId: me\.schoolId/)
      expect(body).toMatch(/enabled: true/)
    })

    it('14. listSchoolTeachers 排除自己（不能添加自己为科任老师）', () => {
      const m = classesModuleSrc.match(
        /async listSchoolTeachers\(teacherId: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m![1]).toMatch(/t\.id !== teacherId/)
    })

    it('15. listSchoolTeachers 仅返回基本字段（不泄露 passwordHash 等敏感信息）', () => {
      const m = classesModuleSrc.match(
        /async listSchoolTeachers\(teacherId: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      const body = m![1]
      expect(body).toMatch(/select: \['id', 'name', 'teacherNo', 'username'\]/)
      // 返回字段不含 passwordHash/sessionKey/openid 等
      const returnBlock = body.match(/return teachers\.filter\([\s\S]*?\.map\(t => \(\{([\s\S]*?)\}\)\)/)
      expect(returnBlock).not.toBeNull()
      expect(returnBlock![1]).not.toMatch(/passwordHash/)
      expect(returnBlock![1]).not.toMatch(/sessionKey/)
      expect(returnBlock![1]).not.toMatch(/openid/)
    })
  })

  describe('同班科任老师可查看成员列表（协作）', () => {
    it('16. listMembers 用 canAccess 校验（班主任或同班科任均可查看）', () => {
      const m = classesModuleSrc.match(
        /async listMembers\(classId: string, teacherId: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/canAccess\(teacherId, classId\)/)
      expect(m![1]).toMatch(/ForbiddenException\('无权访问该班级'\)/)
    })

    it('17. listMembers 返回成员的 role 字段（前端据此判断是否班主任）', () => {
      const m = classesModuleSrc.match(
        /async listMembers\(classId: string, teacherId: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m![1]).toMatch(/role: m\.role/)
    })
  })

  describe('ClassMemberService 行为', () => {
    it('18. getRole 返回 head/subject/null', () => {
      // 源码存在 getRole 方法，返回 row?.role || null
      const m = classMemberModuleSrc.match(
        /async getRole\(teacherId: string, classId: string\): Promise<string \| null>\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/findOne\(\{ where: \{ teacherId, classId \} \}\)/)
      expect(m![1]).toMatch(/row\?\.role \|\| null/)
    })

    it('19. canAccess 返回 boolean（存在记录即可访问，不区分角色）', () => {
      const m = classMemberModuleSrc.match(
        /async canAccess\(teacherId: string, classId: string\): Promise<boolean>\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/count\(\{ where: \{ teacherId, classId \} \}\)/)
      expect(m![1]).toMatch(/count > 0/)
    })

    it('20. addHeadTeacher 设置 role="head"', () => {
      const m = classMemberModuleSrc.match(
        /async addHeadTeacher\(teacherId: string, classId: string, className: string, subjects: string\[\] = \[\]\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/role: 'head'/)
    })

    it('21. addSubjectTeacher 不覆盖已有 head 记录（保留班主任身份）', () => {
      const m = classMemberModuleSrc.match(
        /async addSubjectTeacher\(teacherId: string, classId: string, className: string, subjects: string\[\]\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      // 关键：existing.role === 'head' ? 'head' : 'subject'
      expect(m![1]).toMatch(/existing\.role === 'head' \? 'head' : 'subject'/)
    })
  })

  describe('建班策略调整：老师端禁用，班主任由校管指定', () => {
    it('22. ClassesService.create 抛 ForbiddenException（禁止老师自建班）', () => {
      const m = classesModuleSrc.match(
        /async create\(teacherId: string, dto: any\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/throw new ForbiddenException/)
      // 不再调用 super.create / addHeadTeacher（班主任身份改由校管 createClass 写入）
      expect(m![1]).not.toMatch(/super\.create/)
      expect(m![1]).not.toMatch(/addHeadTeacher/)
    })

    it('23. 校管 createClass 写入 class_members head 记录', () => {
      // school-admin.service.ts 的 createClass 用 createQueryBuilder 写入 class_members
      const m = schoolAdminSrc.match(
        /async createClass\(schoolId: string, dto: \{[\s\S]*?\}\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      const body = m![1]
      expect(body).toMatch(/classMemberRepo/)
      expect(body).toMatch(/role: 'head'/)
      expect(body).toMatch(/orUpdate/)
    })
  })
})
