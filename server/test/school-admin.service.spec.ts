import 'reflect-metadata'
import { BadRequestException } from '@nestjs/common'
import { SchoolAdminService } from '../src/school-admin/school-admin.service'
import { StudentOpsService } from '../src/school-admin/student-ops.service'

/** 构造一个包含常用 Repository 方法的 mock 对象 */
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

describe('SchoolAdminService（A03拆分后保留公告/只读查询/学生管理/导出逻辑）', () => {
  let service: SchoolAdminService
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
  let classMemberRepo: any
  let classMemberSvc: any
  let audit: any
  let ai: any
  let em: any
  let gradeRepo: any
  let examRepo: any

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
      getRepository: jest.fn(() => mockRepo()),
      query: jest.fn().mockResolvedValue(undefined),
    }
    // SchoolAdminService 拆分后构造器：jwt, saRepo, userRepo, studentRepo, schoolRepo, classRepo,
    // noticeRepo, attRepo, hwRepo, gradeRepo, examRepo, audit（ai/classMgmt/entityManager 随学生操作拆出）
    service = new SchoolAdminService(
      jwt as any,
      saRepo,
      userRepo,
      studentRepo,
      schoolRepo,
      classRepo,
      noticeRepo,
      attRepo,
      hwRepo,
      gradeRepo,
      examRepo,
      audit as any,
    )
    // 学生操作已拆分至 StudentOpsService（A03 拆分第 3 步）
    studentOps = new StudentOpsService(
      userRepo,
      studentRepo,
      classRepo,
      em as any,
      audit as any,
      ai as any,
      {} as any, // classMgmt 占位
    )
  })

  describe('listSchoolNotices（查询修复：用校管 id 而非教师 id 查询公告）', () => {
    it('应先查本校校管 id 列表，再用校管 id 作为 teacherId 查询 scope=school 公告', async () => {
      saRepo.find.mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }])
      noticeRepo.findAndCount.mockResolvedValue([
        [{ id: 'n1', title: '公告1', teacherId: 'admin-1', scope: 'school' }],
        1,
      ])

      const res = await service.listSchoolNotices('school-1')

      // 1) 先用 schoolId 查校管 id 列表
      expect(saRepo.find).toHaveBeenCalledWith({ where: { schoolId: 'school-1' }, select: ['id'] })
      // 2) 再用校管 id（而非教师 id）作为 teacherId 查询公告
      expect(noticeRepo.findAndCount).toHaveBeenCalledWith({
        where: [
          { teacherId: 'admin-1', scope: 'school' },
          { teacherId: 'admin-2', scope: 'school' },
        ],
        order: { createdAt: 'DESC' },
      })
      expect(res.total).toBe(1)
      expect(res.items[0].title).toBe('公告1')
    })

    it('无校管时返回空列表', async () => {
      saRepo.find.mockResolvedValue([])
      const res = await service.listSchoolNotices('school-1')
      expect(res).toEqual({ items: [], total: 0 })
      expect(noticeRepo.findAndCount).not.toHaveBeenCalled()
    })
  })

  describe('deleteSchoolNotice（越权修复：校验公告属于本校校管）', () => {
    it('公告不属于本校校管时应抛出 "无权操作此公告"', async () => {
      noticeRepo.findOne.mockResolvedValue({
        id: 'n1',
        teacherId: 'admin-other',
        scope: 'school',
        title: '外校公告',
      })
      // 校管表中按 { id: 'admin-other', schoolId: 'school-1' } 查不到 → 不属于本校
      saRepo.findOne.mockResolvedValue(null)

      await expect(service.deleteSchoolNotice('school-1', 'n1')).rejects.toThrow('无权操作此公告')
      await expect(service.deleteSchoolNotice('school-1', 'n1')).rejects.toThrow(BadRequestException)
      // 不应执行删除
      expect(noticeRepo.remove).not.toHaveBeenCalled()
    })

    it('公告属于本校校管时应正常删除', async () => {
      const notice = { id: 'n1', teacherId: 'admin-1', scope: 'school', title: '本校公告' }
      noticeRepo.findOne.mockResolvedValue(notice)
      saRepo.findOne.mockResolvedValue({ id: 'admin-1', schoolId: 'school-1' })
      noticeRepo.remove.mockResolvedValue(undefined)

      await service.deleteSchoolNotice('school-1', 'n1')

      // 校验按 { id: notice.teacherId, schoolId } 查校管
      expect(saRepo.findOne).toHaveBeenCalledWith({ where: { id: 'admin-1', schoolId: 'school-1' } })
      expect(noticeRepo.remove).toHaveBeenCalledWith(notice)
    })

    it('公告不存在时应抛出 "公告不存在"', async () => {
      noticeRepo.findOne.mockResolvedValue(null)
      await expect(service.deleteSchoolNotice('school-1', 'n1')).rejects.toThrow('公告不存在')
    })
  })

  describe('updateStudent / deleteStudent（已拆分至 StudentOpsService）', () => {
    it('updateStudent 应更新学生信息', async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'stu-1', studentNo: 'S001' })
      classRepo.findOne.mockResolvedValue({ id: 'c1', teacherId: 't1' })
      userRepo.findOne.mockResolvedValue({ id: 't1', schoolId: 'school-1' })
      studentRepo.save.mockImplementation(async (s: any) => s)

      await studentOps.updateStudent('school-1', 'stu-1', { name: '新名字' })

      expect(studentRepo.save).toHaveBeenCalled()
    })
  })
})

describe('SchoolAdminService 拆分后移到 TeacherMgmtService 的方法', () => {
  // 以下测试已拆分至 school-admin-refactor.spec.ts
  it.todo('createTeacher 行为验证见 TeacherMgmtService 相关测试')
  it.todo('deleteTeacher 行为验证见 TeacherMgmtService 相关测试')
  it.todo('batchCreateTeachers 行为验证见 TeacherMgmtService 相关测试')
})

describe('SchoolAdminService 拆分后移到 ClassMgmtService 的方法', () => {
  // 以下测试已拆分至 school-admin-refactor.spec.ts
  it.todo('createClass 行为验证见 ClassMgmtService 相关测试')
  it.todo('updateClass 行为验证见 ClassMgmtService 相关测试')
  it.todo('学期轮换场景 行为验证见 ClassMgmtService 相关测试')
})
