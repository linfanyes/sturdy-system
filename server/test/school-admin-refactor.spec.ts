import 'reflect-metadata'
import fs from 'fs'
import path from 'path'
import { SchoolAdminService } from '../src/school-admin/school-admin.service'
import { TeacherMgmtService } from '../src/school-admin/teacher-mgmt.service'
import { ClassMgmtService } from '../src/school-admin/class-mgmt.service'
import { StudentOpsService } from '../src/school-admin/student-ops.service'
import { SchoolAdminModule } from '../src/school-admin/school-admin.module'
import { BadRequestException } from '@nestjs/common'
import { hashPassword } from '../src/common/utils/password.util'

/**
 * SchoolAdminService 重构验证
 *
 * 重构内容：将教师管理（TeacherMgmtService）和班级管理（ClassMgmtService）
 * 从 SchoolAdminService 中拆分为独立的 @Injectable 服务。
 *
 * 验证目标：
 * - 拆分出去的方法在新服务中存在且可用
 * - SchoolAdminService 原有保留方法仍然可正常工作
 * - 新服务正确导出必要方法
 */

/** 构造 mock repo */
function mockRepo(): any {
  const repo: any = {}
  repo.findOne = jest.fn()
  repo.find = jest.fn()
  repo.findAndCount = jest.fn()
  repo.save = jest.fn()
  repo.remove = jest.fn()
  repo.create = jest.fn()
  repo.update = jest.fn().mockResolvedValue(undefined)
  repo.delete = jest.fn()
  repo.count = jest.fn()
  repo.createQueryBuilder = jest.fn()
  return repo
}

function mockRepoWithManager(): any {
  const repo = mockRepo()
  repo.manager = { connection: { options: { type: 'sqlite' } } }
  return repo
}

describe('SchoolAdminService 重构验证', () => {
  // ========== 源码结构断言 ==========
  describe('源码结构：方法归属正确', () => {
    let saSrc: string
    let teacherSrc: string
    let classSrc: string
    let studentOpsSrc: string

    beforeAll(() => {
      saSrc = fs.readFileSync(
        path.resolve(__dirname, '../src/school-admin/school-admin.service.ts'),
        'utf8',
      )
      teacherSrc = fs.readFileSync(
        path.resolve(__dirname, '../src/school-admin/teacher-mgmt.service.ts'),
        'utf8',
      )
      classSrc = fs.readFileSync(
        path.resolve(__dirname, '../src/school-admin/class-mgmt.service.ts'),
        'utf8',
      )
      studentOpsSrc = fs.readFileSync(
        path.resolve(__dirname, '../src/school-admin/student-ops.service.ts'),
        'utf8',
      )
    })

    it('SchoolAdminService 不再包含 listTeachers / createTeacher 等方法（已拆分）', () => {
      // 这些方法应已迁移到 TeacherMgmtService
      expect(saSrc).not.toMatch(/async listTeachers/)
      expect(saSrc).not.toMatch(/async createTeacher/)
      expect(saSrc).not.toMatch(/async updateTeacher/)
      expect(saSrc).not.toMatch(/async deleteTeacher/)
      expect(saSrc).not.toMatch(/async resetPassword/)
      expect(saSrc).not.toMatch(/async batchCreateTeachers/)
    })

    it('SchoolAdminService 不再包含 listClasses / createClass 等方法（已拆分）', () => {
      // 这些方法应已迁移到 ClassMgmtService
      expect(saSrc).not.toMatch(/async listClasses/)
      expect(saSrc).not.toMatch(/async createClass/)
      expect(saSrc).not.toMatch(/async updateClass/)
      expect(saSrc).not.toMatch(/async deleteClass/)
      expect(saSrc).not.toMatch(/async promoteClass/)
      expect(saSrc).not.toMatch(/async listSchoolStudents/)
    })

    it('SchoolAdminService 不应再包含学生增删改/导出方法（已拆至 StudentOpsService）', () => {
      expect(saSrc).not.toMatch(/async updateStudent/)
      expect(saSrc).not.toMatch(/async deleteStudent/)
      expect(saSrc).not.toMatch(/async batchCreateStudents/)
      expect(saSrc).not.toMatch(/async exportStudents/)
    })

    it('SchoolAdminService 应保留 login / dashboard / 公告 / 考试 / 成绩 等方法', () => {
      // login / dashboard
      expect(saSrc).toMatch(/async login/)
      expect(saSrc).toMatch(/async dashboard/)
      // 学校公告
      expect(saSrc).toMatch(/async listSchoolNotices/)
      expect(saSrc).toMatch(/async createSchoolNotice/)
      expect(saSrc).toMatch(/async deleteSchoolNotice/)
      expect(saSrc).toMatch(/async updateSchoolNotice/)
      // 学生管理（A03 拆分第 3 步后位于 StudentOpsService）
      expect(studentOpsSrc).toMatch(/async updateStudent/)
      expect(studentOpsSrc).toMatch(/async deleteStudent/)
      expect(studentOpsSrc).toMatch(/async batchCreateStudents/)
      // 成绩/考试只读
      expect(saSrc).toMatch(/async listSchoolExams/)
      expect(saSrc).toMatch(/async listSchoolGrades/)
      expect(saSrc).toMatch(/async schoolGradeSummary/)
      // 搜索
      expect(saSrc).toMatch(/async search/)
      // 导出（随学生操作拆至 StudentOpsService）
      expect(studentOpsSrc).toMatch(/async exportStudents/)
      expect(studentOpsSrc).toMatch(/async exportStudentsXls/)
      // 功能包
      expect(saSrc).toMatch(/async getSchoolFeatures/)
      expect(saSrc).toMatch(/async updateSchoolFeatures/)
    })

    it('StudentOpsService 应注入并使用 ClassMgmtService（导出学生）', () => {
      expect(studentOpsSrc).toMatch(/classMgmt: ClassMgmtService/)
      // 导出学生时使用 classMgmt
      expect(studentOpsSrc).toMatch(/classMgmt\.listSchoolStudents/)
    })

    it('TeacherMgmtService 应包含所有教师管理方法', () => {
      expect(teacherSrc).toMatch(/export class TeacherMgmtService/)
      expect(teacherSrc).toMatch(/async listTeachers/)
      expect(teacherSrc).toMatch(/async createTeacher/)
      expect(teacherSrc).toMatch(/async updateTeacher/)
      expect(teacherSrc).toMatch(/async deleteTeacher/)
      expect(teacherSrc).toMatch(/async resetPassword/)
      expect(teacherSrc).toMatch(/async batchCreateTeachers/)
      expect(teacherSrc).toMatch(/async updateTeacherFeatures/)
      expect(teacherSrc).toMatch(/async deactivateAllTeachers/)
      expect(teacherSrc).toMatch(/async listParentLogins/)
      expect(teacherSrc).toMatch(/async exportTeachers/)
      expect(teacherSrc).toMatch(/async exportTeachersXls/)
      expect(teacherSrc).toMatch(/async aiRecognizeTeachers/)
      expect(teacherSrc).toMatch(/async parseTeacherFile/)
    })

    it('ClassMgmtService 应包含所有班级管理方法', () => {
      expect(classSrc).toMatch(/export class ClassMgmtService/)
      expect(classSrc).toMatch(/async listClasses/)
      expect(classSrc).toMatch(/async getClass/)
      expect(classSrc).toMatch(/async createClass/)
      expect(classSrc).toMatch(/async updateClass/)
      expect(classSrc).toMatch(/async deleteClass/)
      expect(classSrc).toMatch(/async promoteClass/)
      expect(classSrc).toMatch(/async batchCreateClasses/)
      expect(classSrc).toMatch(/async parseClassFile/)
      expect(classSrc).toMatch(/async aiRecognizeClasses/)
      expect(classSrc).toMatch(/async listSchoolStudents/)
      expect(classSrc).toMatch(/async exportClassesXls/)
    })
  })

  // ========== 行为功能验证 ==========
  describe('行为验证：拆分后方法可用', () => {
    let saService: SchoolAdminService
    let teacherSvc: TeacherMgmtService
    let classSvc: ClassMgmtService
    let studentOps: StudentOpsService

    let jwt: any
    let saRepo: any
    let userRepo: any
    let studentRepo: any
    let schoolRepo: any
    let classRepo: any
    let noticeRepo: any
    let attRepo: any
    let hwRepo: any
    let gradeRepo: any
    let examRepo: any
    let classMemberRepo: any
    let classMemberSvc: any
    let audit: any
    let ai: any
    let em: any
    let classMgmt: ClassMgmtService

    beforeEach(() => {
      jwt = { sign: jest.fn().mockReturnValue('jwt-token') }
      saRepo = mockRepo()
      userRepo = mockRepo()
      studentRepo = mockRepo()
      schoolRepo = mockRepo()
      classRepo = mockRepo()
      noticeRepo = mockRepo()
      attRepo = mockRepo()
      hwRepo = mockRepo()
      gradeRepo = mockRepo()
      examRepo = mockRepo()
      classMemberRepo = mockRepo()
      classMemberSvc = {
        assertCanBecomeHead: jest.fn().mockResolvedValue(undefined),
        assertTeacherNotHeadElsewhere: jest.fn().mockResolvedValue(undefined),
        addHeadTeacher: jest.fn().mockResolvedValue(undefined),
        addSubjectTeacher: jest.fn().mockResolvedValue(undefined),
        removeMember: jest.fn().mockResolvedValue(undefined),
      }
      audit = { log: jest.fn().mockResolvedValue(undefined) }
      ai = {
        parse: jest.fn().mockResolvedValue([]),
        parseFile: jest.fn().mockResolvedValue({ text: '' }),
      }
      em = {
        transaction: jest.fn(async (cb: any) => cb(em)),
        getRepository: jest.fn(() => mockRepoWithManager()),
        query: jest.fn().mockResolvedValue(undefined),
      }

      classMgmt = new ClassMgmtService(
        classRepo, studentRepo, userRepo, classMemberRepo,
        classMemberSvc as any, audit as any, ai as any, em as any,
      )

      saService = new SchoolAdminService(
        jwt as any, saRepo, userRepo, studentRepo, schoolRepo, classRepo,
        noticeRepo, attRepo, hwRepo, gradeRepo, examRepo,
        audit as any,
      )

      studentOps = new StudentOpsService(
        userRepo, studentRepo, classRepo,
        em as any, audit as any, ai as any, classMgmt,
      )

      teacherSvc = new TeacherMgmtService(
        userRepo, studentRepo, schoolRepo, classRepo,
        classMemberSvc as any, audit as any, ai as any, em as any,
      )

      classSvc = new ClassMgmtService(
        classRepo, studentRepo, userRepo, classMemberRepo,
        classMemberSvc as any, audit as any, ai as any, em as any,
      )
    })

    it('SchoolAdminService.login 仍然可用', async () => {
      const admin = {
        id: 'admin-1', username: 'sa01',
        passwordHash: hashPassword('mypassword'), name: '校管A',
        schoolId: 'school-1', enabled: true,
      }
      saRepo.findOne.mockResolvedValue(admin)
      schoolRepo.findOne.mockResolvedValue({ id: 'school-1', name: '测试学校', code: 'S01' })

      const res = await saService.login('sa01', 'mypassword')
      expect(res.token).toBe('jwt-token')
      expect(res.admin.name).toBe('校管A')
    })

    it('SchoolAdminService.dashboard 仍然可用', async () => {
      userRepo.find.mockResolvedValue([
        { id: 't1', schoolId: 'school-1', enabled: true, subject: '语文', subjects: [] },
      ])
      classRepo.find.mockResolvedValue([{ id: 'c1', teacherId: 't1' }])
      studentRepo.count.mockResolvedValue(10)
      studentRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ classId: 'c1', cnt: '10' }]),
      })
      attRepo.find.mockResolvedValue([])
      hwRepo.count.mockResolvedValue(0)

      const res = await saService.dashboard('school-1')
      expect(res.totalTeachers).toBe(1)
      expect(res.totalClasses).toBe(1)
      expect(res.totalStudents).toBe(10)
    })

    it('StudentOpsService.updateStudent 仍然可用（学生操作已拆出）', async () => {
      studentRepo.findOne.mockResolvedValue({
        id: 'stu-1', studentNo: 'S001', classId: 'c1', name: '小明', gender: '男',
      })
      classRepo.findOne.mockResolvedValue({ id: 'c1', teacherId: 't1' })
      userRepo.findOne.mockResolvedValue({ id: 't1', schoolId: 'school-1' })
      studentRepo.save.mockImplementation(async (s: any) => s)

      const res = await studentOps.updateStudent('school-1', 'stu-1', { name: '小明（更新）' })
      expect(res.name).toBe('小明（更新）')
    })

    it('SchoolAdminService.listSchoolNotices 仍然可用', async () => {
      saRepo.find.mockResolvedValue([{ id: 'admin-1' }])
      noticeRepo.findAndCount.mockResolvedValue([
        [{ id: 'n1', title: '公告1', teacherId: 'admin-1', scope: 'school' }],
        1,
      ])

      const res = await saService.listSchoolNotices('school-1')
      expect(res.total).toBe(1)
    })

    it('SchoolAdminService.search 仍然可用', async () => {
      userRepo.find.mockResolvedValue([
        { id: 't1', name: '张老师', username: 'zhang', teacherNo: 'T001', subject: '语文' },
      ])
      classRepo.find.mockResolvedValue([])
      studentRepo.find.mockResolvedValue([])

      const res = await saService.search('school-1', '张')
      expect(res.teachers).toHaveLength(1)
    })

    it('TeacherMgmtService.listTeachers 可用且返回教师列表', async () => {
      userRepo.findAndCount.mockResolvedValue([
        [
          { id: 't1', name: '张老师', username: 'zhang', subject: '语文', phone: '13800000001', gender: '男', school: '测试学校', features: [], enabled: true, createdAt: new Date(), teacherNo: 'JS001', position: '', positions: [], grade: '' },
        ],
        1,
      ])

      const res = await teacherSvc.listTeachers('school-1')
      expect(res.total).toBe(1)
      expect(res.items[0].name).toBe('张老师')
    })

    it('TeacherMgmtService.updateTeacher 可用', async () => {
      userRepo.findOne.mockResolvedValue({ id: 't1', name: '张老师', username: 'zhang', schoolId: 'school-1' })
      const res = await teacherSvc.updateTeacher('school-1', 't1', { subject: '数学' })
      expect(res.ok).toBe(true)
    })

    it('ClassMgmtService.listClasses 可用', async () => {
      userRepo.find.mockResolvedValue([{ id: 't1', schoolId: 'school-1' }])
      classRepo.findAndCount.mockResolvedValue([
        [{ id: 'c1', name: '三年级1班', teacherId: 't1', grade: '三年级', classNo: '1', headTeacher: '', term: '', subjects: [] }],
        1,
      ])
      studentRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ classId: 'c1', cnt: '20' }]),
      })
      classMemberRepo.find.mockResolvedValue([])

      const res = await classSvc.listClasses('school-1')
      expect(res.total).toBe(1)
      expect((res.items[0] as any).studentCount).toBe(20)
    })

    it('ClassMgmtService.createClass 可用', async () => {
      userRepo.findOne.mockResolvedValue({ id: 't1', schoolId: 'school-1', name: '张老师' })
      classRepo.create.mockReturnValue({ id: 'c1', name: '三年级1班' })
      classRepo.save.mockResolvedValue({ id: 'c1', name: '三年级1班', teacherId: 't1' })

      const res = await classSvc.createClass('school-1', {
        name: '三年级1班', grade: '三年级', classNo: '1',
        headTeacher: '张老师', headTeacherId: 't1',
      })
      expect(res.name).toBe('三年级1班')
      expect(classMemberSvc.addHeadTeacher).toHaveBeenCalled()
    })

    it('SchoolAdminMethod 方法拆分后应作为独立服务类存在（运行时验证）', () => {
      // 验证 TeacherMgmtService 和 ClassMgmtService 是可实例化的独立类
      expect(typeof TeacherMgmtService).toBe('function')
      expect(typeof ClassMgmtService).toBe('function')
      expect(teacherSvc).toBeInstanceOf(TeacherMgmtService)
      expect(classSvc).toBeInstanceOf(ClassMgmtService)
    })
  })
})
