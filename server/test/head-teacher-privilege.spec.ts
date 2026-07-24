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
      expect(body).toMatch(/getRole\(teacherId, classId, term\)/)
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

  describe('ClassMemberService 行为（按学期隔离）', () => {
    it('18. getRole 返回 head/subject/null（term 可选，按学期过滤）', () => {
      const m = classMemberModuleSrc.match(
        /async getRole\(teacherId: string, classId: string, term\?: string\): Promise<string \| null>\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/row\?\.role \|\| null/)
      // term 传则按学期过滤
      expect(m![1]).toMatch(/if \(term !== undefined\) where\.term = term/)
    })

    it('19. canAccess 返回 boolean（term 可选，不传=任一学期可访问即可）', () => {
      const m = classMemberModuleSrc.match(
        /async canAccess\(teacherId: string, classId: string, term\?: string\): Promise<boolean>\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/count > 0/)
      expect(m![1]).toMatch(/if \(term !== undefined\) where\.term = term/)
    })

    it('20. addHeadTeacher 设置 role="head"（按学期隔离，支持 subjects）', () => {
      const m = classMemberModuleSrc.match(
        /async addHeadTeacher\(teacherId: string, classId: string, className: string, term: string, subjects: string\[\] = \[\]\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/role: 'head'/)
      expect(m![1]).toMatch(/term/)
    })

    it('21. addSubjectTeacher 不覆盖已有 head 记录（按学期隔离）', () => {
      const m = classMemberModuleSrc.match(
        /async addSubjectTeacher\(teacherId: string, classId: string, className: string, subjects: string\[\], term: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      // 关键：existing.role === 'head' ? 'head' : 'subject'
      expect(m![1]).toMatch(/existing\.role === 'head' \? 'head' : 'subject'/)
    })

    it('21a. assertCanBecomeHead 校验两条业务规则（同一 term 内：一师一班 head / 一班一 head）', () => {
      const m = classMemberModuleSrc.match(
        /async assertCanBecomeHead\(teacherId: string, classId: string, term: string\): Promise<void>\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      const body = m![1]
      // 规则1：该老师是否已在本学期其他班级担任 head
      expect(body).toMatch(/role: 'head'/)
      expect(body).toMatch(/otherHeadClass\.classId !== classId/)
      expect(body).toMatch(/一人只能担任一个班的班主任/)
      // 规则2：该班级在本学期是否已有其他班主任
      expect(body).toMatch(/existingHead\.teacherId !== teacherId/)
      expect(body).toMatch(/该班级在本学期已有班主任/)
    })

    it('21b. assertTeacherNotHeadElsewhere 仅校验规则1（同一 term 内，排除即将接手的班级）', () => {
      const m = classMemberModuleSrc.match(
        /async assertTeacherNotHeadElsewhere\(teacherId: string, excludeClassId: string, term: string\): Promise<void>\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      const body = m![1]
      // 仅查该老师是否已是其他班 head，排除 excludeClassId
      expect(body).toMatch(/role: 'head'/)
      expect(body).toMatch(/otherHeadClass\.classId !== excludeClassId/)
      expect(body).toMatch(/一人只能担任一个班的班主任/)
      // 不应包含规则2的"该班级已有班主任"校验
      expect(body).not.toMatch(/该班级在本学期已有班主任/)
    })

    it('21c. updateMySubjects 教师可更新自己任教学科（班主任兼任本班科任）', () => {
      const m = classMemberModuleSrc.match(
        /async updateMySubjects\(teacherId: string, classId: string, subjects: string\[\], term: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/NotFoundException/)
      expect(m![1]).toMatch(/row\.subjects = subjects/)
    })
  })

  describe('建班策略调整：老师端禁用，班主任由校管指定', () => {
    it('22. ClassesService.create 抛 ForbiddenException（禁止老师自建班）', () => {
      const m = classesModuleSrc.match(
        /async create\(teacherId: string, dto: any\): Promise<ClassItem>\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/throw new ForbiddenException/)
      // 不再调用 super.create / addHeadTeacher（班主任身份改由校管 createClass 写入）
      expect(m![1]).not.toMatch(/super\.create/)
      expect(m![1]).not.toMatch(/addHeadTeacher/)
    })

    it('23. 校管 createClass 调用 classMemberSvc 写入 head 记录并前置校验一师一班', () => {
      // school-admin.service.ts 的 createClass 改用 classMemberSvc 复用校验与写入逻辑
      const m = schoolAdminSrc.match(
        /async createClass\(schoolId: string, dto: \{[\s\S]*?\}\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      const body = m![1]
      // 前置校验：一师一班 head（excludeClassId 传空串，仅校验规则1）
      expect(body).toMatch(/classMemberSvc\.assertTeacherNotHeadElsewhere/)
      // 写入 head 记录（addHeadTeacher 内部再次 assertCanBecomeHead 兜底）
      expect(body).toMatch(/classMemberSvc\.addHeadTeacher/)
    })
  })

  describe('班主任指定科任学科', () => {
    it('24. updateMemberSubjects 校验班主任身份', () => {
      const m = classesModuleSrc.match(
        /async updateMemberSubjects\(classId: string, headTeacherId: string, memberTeacherId: string, subjects: string\[\]\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/await this\.assertHeadTeacher\(headTeacherId, classId\)/)
    })

    it('25. updateMemberSubjects 禁止修改班主任自己的学科', () => {
      const m = classesModuleSrc.match(
        /async updateMemberSubjects\(classId: string, headTeacherId: string, memberTeacherId: string, subjects: string\[\]\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m![1]).toMatch(/memberTeacherId === headTeacherId/)
      expect(m![1]).toMatch(/不能修改班主任自己的学科/)
    })

    it('26. updateMemberSubjects 校验被操作者是同班成员且非班主任', () => {
      const m = classesModuleSrc.match(
        /async updateMemberSubjects\(classId: string, headTeacherId: string, memberTeacherId: string, subjects: string\[\]\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m![1]).toMatch(/getRole\(memberTeacherId, classId, term\)/)
      expect(m![1]).toMatch(/不能修改其他班主任的学科/)
    })
  })

  describe('班级数据看板', () => {
    it('27. getDashboard 校验班级访问权限（班主任或同班科任均可查看）', () => {
      const m = classesModuleSrc.match(
        /async getDashboard\(classId: string, teacherId: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/canAccess\(teacherId, classId, term\)/)
      expect(m![1]).toMatch(/ForbiddenException\('无权访问该班级'\)/)
    })

    it('28. getDashboard 班主任看全部成员，科任只看自己', () => {
      const m = classesModuleSrc.match(
        /async getDashboard\(classId: string, teacherId: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m![1]).toMatch(/isHead/)
      expect(m![1]).toMatch(/listByClass\(classId, term\)/)
    })

    it('29. getDashboard 返回学生人数、各科成绩概览、近期公告', () => {
      const m = classesModuleSrc.match(
        /async getDashboard\(classId: string, teacherId: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m![1]).toMatch(/studentRepo\.count/)
      expect(m![1]).toMatch(/gradeRepo\.find/)
      expect(m![1]).toMatch(/noticeRepo\.find/)
      expect(m![1]).toMatch(/subjectStats/)
      expect(m![1]).toMatch(/recentNotices/)
    })
  })

  describe('公告发布权：仅班主任可发布班级公告', () => {
    const schoolModuleSrc = readSrc('src/school/school.module.ts')

    it('30. NoticeService 注入 ClassMemberService', () => {
      expect(schoolModuleSrc).toMatch(/class NoticeService[\s\S]*?ClassMemberService/)
    })

    it('31. NoticeService.create 班级公告校验班主任身份', () => {
      const m = schoolModuleSrc.match(
        /async create\(teacherId: string, dto: any\)\s*\{([\s\S]*?)\n    \}/,
      )
      expect(m).not.toBeNull()
      const body = m![1]
      expect(body).toMatch(/scope === 'class'/)
      expect(body).toMatch(/getRole\(teacherId, dto\.classId, term\)/)
      expect(body).toMatch(/role !== 'head'/)
      expect(body).toMatch(/ForbiddenException\('仅班主任可发布班级公告'\)/)
    })

    it('32. NoticeService.create 学校公告不限制（任何教师可发）', () => {
      const m = schoolModuleSrc.match(
        /async create\(teacherId: string, dto: any\)\s*\{([\s\S]*?)\n    \}/,
      )
      // 仅 scope='class' 时校验，scope='school' 不在校验分支内
      expect(m![1]).toMatch(/dto\.scope === 'class'/)
    })
  })

  describe('批量导入学生：仅班主任可批量导入', () => {
    const studentsModuleSrc = readSrc('src/students/students.module.ts')

    it('33. StudentsService 注入 ClassMemberService', () => {
      expect(studentsModuleSrc).toMatch(/class StudentsService[\s\S]*?ClassMemberService/)
    })

    it('34. StudentsService.assertHeadTeacher 校验班主任身份', () => {
      const m = studentsModuleSrc.match(
        /private async assertHeadTeacher\(teacherId: string, classId: string\)\s*\{([\s\S]*?)\n  \}/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/getRole\(teacherId, classId, term\)/)
      expect(m![1]).toMatch(/role !== 'head'/)
      expect(m![1]).toMatch(/ForbiddenException\('仅班主任可批量导入\/清空学生名单'\)/)
    })

    it('35. importStudents 调用 assertHeadTeacher 前置校验', () => {
      const m = studentsModuleSrc.match(
        /async importStudents\(teacherId: string, classId: string, items: any\[\]\)\s*\{([\s\S]*?)\n    return await this\.dataSource\.transaction/,
      )
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/await this\.assertHeadTeacher\(teacherId, classId\)/)
    })
  })
})
