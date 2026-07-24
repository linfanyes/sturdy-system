import 'reflect-metadata'
import { BadRequestException } from '@nestjs/common'
import { SchoolAdminService } from '../src/school-admin/school-admin.service'
import { hashPassword } from '../src/common/utils/password.util'

/** 构造一个包含常用 Repository 方法的 mock 对象 */
function mockRepo(): any {
  const repo: any = {}
  repo.findOne = jest.fn()
  repo.find = jest.fn()
  repo.findAndCount = jest.fn()
  repo.save = jest.fn()
  repo.remove = jest.fn()
  repo.create = jest.fn()
  repo.delete = jest.fn()
  repo.count = jest.fn()
  repo.createQueryBuilder = jest.fn()
  return repo
}

describe('SchoolAdminService', () => {
  let service: SchoolAdminService
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
  let em: any

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
    classMemberRepo = mockRepo()
    classMemberSvc = {
      assertCanBecomeHead: jest.fn().mockResolvedValue(undefined),
      assertTeacherNotHeadElsewhere: jest.fn().mockResolvedValue(undefined),
      addHeadTeacher: jest.fn().mockResolvedValue(undefined),
      addSubjectTeacher: jest.fn().mockResolvedValue(undefined),
      removeMember: jest.fn().mockResolvedValue(undefined),
    }
    audit = { log: jest.fn().mockResolvedValue(undefined) }
    // EntityManager mock：transaction 直接执行回调并传入自身
    em = {
      transaction: jest.fn(async (cb: any) => cb(em)),
      getRepository: jest.fn(),
      query: jest.fn().mockResolvedValue(undefined),
    }
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
      classMemberRepo,
      classMemberSvc as any,
      audit as any,
      em as any,
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

  describe('deleteTeacher（级联删除：包含新增的表 notices/lesson_observations/work_logs 等）', () => {
    it('删除教师时对新增级联表执行 DELETE 语句', async () => {
      const user = { id: 't1', name: '张老师', username: 'zhang' }
      userRepo.findOne.mockResolvedValue(user)
      const classItemRepoEm = { delete: jest.fn().mockResolvedValue(undefined) }
      const userRepoEm = { remove: jest.fn().mockResolvedValue(undefined) }
      em.getRepository.mockImplementation((entity: any) => {
        if (entity && entity.name === 'ClassItem') return classItemRepoEm
        if (entity && entity.name === 'User') return userRepoEm
        return { delete: jest.fn().mockResolvedValue(undefined), remove: jest.fn().mockResolvedValue(undefined) }
      })
      em.query.mockResolvedValue(undefined)

      await service.deleteTeacher('school-1', 't1')

      // 事务被调用
      expect(em.transaction).toHaveBeenCalled()
      // ClassItem 级联删除
      expect(classItemRepoEm.delete).toHaveBeenCalledWith({ teacherId: 't1' })
      // User 被 remove
      expect(userRepoEm.remove).toHaveBeenCalledWith(user)

      // 收集所有 em.query 执行的表名
      const queriedTables = em.query.mock.calls.map((c: any[]) => {
        const sql = c[0] as string
        const m = sql.match(/`(\w+)`/)
        return m ? m[1] : ''
      })
      // 关键：新增的表必须被级联删除
      expect(queriedTables).toContain('notices')
      expect(queriedTables).toContain('lesson_observations')
      expect(queriedTables).toContain('work_logs')
      // 原有表也应被处理
      expect(queriedTables).toContain('students')
      expect(queriedTables).toContain('grades')
      // 每条 DELETE 都带 teacherId 参数
      for (const c of em.query.mock.calls) {
        expect(c[1]).toEqual(['t1'])
      }
    })

    it('教师不存在或不属于本校时抛出异常', async () => {
      userRepo.findOne.mockResolvedValue(null)
      await expect(service.deleteTeacher('school-1', 't1')).rejects.toThrow('教师不存在或不属于本校')
    })
  })

  describe('createTeacher', () => {
    const school = { id: 's1', code: 'SCH001', name: '测试学校' }

    function setupEmForCreate(opts: { existUser: any; lastTeacher: any }) {
      const userRepoEm: any = {
        findOne: jest.fn().mockResolvedValue(opts.existUser),
        create: jest.fn((data: any) => ({ ...data })),
        save: jest.fn().mockResolvedValue({ id: 'u-1', name: '王老师', username: 'wang' }),
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(opts.lastTeacher),
        })),
      }
      em.getRepository.mockReturnValue(userRepoEm)
      em.transaction.mockImplementation(async (cb: any) => cb(em))
      return userRepoEm
    }

    it('用户名重复时应抛出 "用户名已存在"', async () => {
      setupEmForCreate({ existUser: { id: 'exist', username: 'wang' }, lastTeacher: null })
      schoolRepo.findOne.mockResolvedValue(school)

      await expect(
        service.createTeacher('s1', { username: 'wang', password: '123456', name: '王老师' }),
      ).rejects.toThrow('用户名已存在')
      await expect(
        service.createTeacher('s1', { username: 'wang', password: '123456', name: '王老师' }),
      ).rejects.toThrow(BadRequestException)
    })

    it('成功创建教师应返回 teacherNo', async () => {
      setupEmForCreate({ existUser: null, lastTeacher: null })
      schoolRepo.findOne.mockResolvedValue(school)

      const res = await service.createTeacher('s1', {
        username: 'wang',
        password: '123456',
        name: '王老师',
        phone: '13800000000',
      })

      expect(res.ok).toBe(true)
      // teacherNo = 'JS' + 学校编号 + 5 位流水号（首条为 00001）
      expect(res.teacherNo).toBe('JSSCH00100001')
      expect(res.name).toBe('王老师')
      // 校验密码哈希被正确传入：bcrypt 格式（$2 开头，长度 60）
      const userRepoEm = em.getRepository()
      expect(userRepoEm.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'wang',
          name: '王老师',
          schoolId: 's1',
          school: '测试学校',
          phone: '13800000000',
          teacherNo: 'JSSCH00100001',
        }),
      )
      // 单独校验 passwordHash 为 bcrypt 格式（不与固定值比较，因盐随机）
      const createCall = userRepoEm.create.mock.calls[0][0]
      expect(createCall.passwordHash).toMatch(/^\$2[abxy]\$\d{2}\$/)
      expect(createCall.passwordHash).toHaveLength(60)
      // 通过 verifyAndUpgrade 可校验通过
      const { verifyAndUpgrade } = require('../src/common/utils/password.util')
      expect(verifyAndUpgrade('123456', createCall.passwordHash).valid).toBe(true)
      // 审计日志被记录
      expect(audit.log).toHaveBeenCalled()
    })

    it('缺必填字段时应抛出异常', async () => {
      await expect(
        service.createTeacher('s1', { username: '', password: '', name: '' }),
      ).rejects.toThrow('用户名/密码/姓名必填')
    })
  })

  describe('updateClass（越权修复：校验班级属于本校）', () => {
    it('班级不属于本校时应抛出 "无权操作此班级"', async () => {
      classRepo.findOne.mockResolvedValue({ id: 'c1', teacherId: 't-other', name: '一班' })
      userRepo.findOne.mockResolvedValue(null) // 该教师不属于本校

      await expect(service.updateClass('school-1', 'c1', { name: '新名' })).rejects.toThrow(
        '无权操作此班级',
      )
      await expect(service.updateClass('school-1', 'c1', { name: '新名' })).rejects.toThrow(
        BadRequestException,
      )
      expect(classRepo.save).not.toHaveBeenCalled()
    })

    it('班级不存在时应抛出 "班级不存在"', async () => {
      classRepo.findOne.mockResolvedValue(null)
      await expect(service.updateClass('school-1', 'c1', { name: '新名' })).rejects.toThrow(
        '班级不存在',
      )
    })

    it('班级属于本校时应正常更新', async () => {
      const cls = { id: 'c1', teacherId: 't1', name: '一班', grade: '一年级', classNo: '1' }
      classRepo.findOne.mockResolvedValue(cls)
      userRepo.findOne.mockResolvedValue({ id: 't1', schoolId: 'school-1', name: '张老师' })
      classRepo.save.mockResolvedValue({ ...cls, name: '新名' })

      const res = await service.updateClass('school-1', 'c1', { name: '新名' })
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 't1', schoolId: 'school-1' } })
      expect(classRepo.save).toHaveBeenCalled()
      expect(res.name).toBe('新名')
    })
  })

  describe('updateClass 转交班主任（业务规则1+2 校验）', () => {
    /** 搭建转交场景：旧班主任 t-old 当前为 c1 的 head，校管要把班主任转给 t-new */
    function setupTransferScene(opts: { newHead?: any } = {}) {
      const cls = { id: 'c1', teacherId: 't-old', name: '一班', grade: '一年级', classNo: '1', headTeacher: '旧老师' }
      classRepo.findOne.mockResolvedValue(cls)
      const oldTeacher = { id: 't-old', schoolId: 'school-1', name: '旧老师' }
      const newHead = opts.newHead === null ? null : (opts.newHead || { id: 't-new', schoolId: 'school-1', name: '新老师' })
      userRepo.findOne.mockImplementation((q: any) => {
        const id = q?.where?.id
        if (id === 't-old') return Promise.resolve(oldTeacher)
        if (id === 't-new') return Promise.resolve(newHead)
        return Promise.resolve(null)
      })
      // 旧 head 降级用到的 createQueryBuilder mock
      const qb: any = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }
      classMemberRepo.createQueryBuilder.mockReturnValue(qb)
      classRepo.save.mockImplementation(async (c: any) => c)
      return { cls, qb }
    }

    it('转交成功：前置校验→降级旧head为subject→写入新head→更新班级teacherId', async () => {
      const { qb } = setupTransferScene()
      const res = await service.updateClass('school-1', 'c1', { headTeacherId: 't-new', headTeacher: '新老师' })

      // 前置校验新班主任不是其他班 head（excludeClassId=c1，排除本班自身；term='' 因 cls 无 term）
      expect(classMemberSvc.assertTeacherNotHeadElsewhere).toHaveBeenCalledWith('t-new', 'c1', '')
      // 旧 head 降级为 subject（按 term 隔离，where 含 term）
      expect(qb.update).toHaveBeenCalled()
      expect(qb.set).toHaveBeenCalledWith({ role: 'subject' })
      expect(qb.where).toHaveBeenCalledWith('classId = :cid AND teacherId = :tid AND term = :term', { cid: 'c1', tid: 't-old', term: '' })
      // 写入新 head 记录（含 term）
      expect(classMemberSvc.addHeadTeacher).toHaveBeenCalledWith('t-new', 'c1', '一班', '')
      // 班级 teacherId 已更新
      expect(res.teacherId).toBe('t-new')
      expect(res.headTeacher).toBe('新老师')
    })

    it('新班主任已是其他班班主任时应抛出 "一人只能担任一个班的班主任"（规则1）', async () => {
      setupTransferScene()
      classMemberSvc.assertTeacherNotHeadElsewhere.mockRejectedValue(
        new BadRequestException('该老师已是「二班」的班主任，一人只能担任一个班的班主任'),
      )
      await expect(service.updateClass('school-1', 'c1', { headTeacherId: 't-new' })).rejects.toThrow(
        '一人只能担任一个班的班主任',
      )
      // 前置校验失败时不应降级旧 head，也不应写入新 head（保证数据一致性）
      expect(classMemberRepo.createQueryBuilder).not.toHaveBeenCalled()
      expect(classMemberSvc.addHeadTeacher).not.toHaveBeenCalled()
    })

    it('新班主任不在本校时应抛出 "指定的新班主任不在本校"', async () => {
      setupTransferScene({ newHead: null })
      await expect(service.updateClass('school-1', 'c1', { headTeacherId: 't-new' })).rejects.toThrow(
        '指定的新班主任不在本校',
      )
      expect(classMemberSvc.assertTeacherNotHeadElsewhere).not.toHaveBeenCalled()
      expect(classMemberSvc.addHeadTeacher).not.toHaveBeenCalled()
    })

    it('未传 headTeacherId 时走普通更新分支，不触发转交逻辑', async () => {
      const { qb } = setupTransferScene()
      const res = await service.updateClass('school-1', 'c1', { name: '新班名' })
      expect(res.name).toBe('新班名')
      expect(classMemberSvc.assertTeacherNotHeadElsewhere).not.toHaveBeenCalled()
      expect(qb.update).not.toHaveBeenCalled()
      expect(classMemberSvc.addHeadTeacher).not.toHaveBeenCalled()
    })

    it('传入的 headTeacherId 与当前班主任相同时不触发转交（走普通更新分支）', async () => {
      const { qb } = setupTransferScene()
      const res = await service.updateClass('school-1', 'c1', { headTeacherId: 't-old', name: '改名' })
      expect(res.name).toBe('改名')
      expect(classMemberSvc.assertTeacherNotHeadElsewhere).not.toHaveBeenCalled()
      expect(qb.update).not.toHaveBeenCalled()
      expect(classMemberSvc.addHeadTeacher).not.toHaveBeenCalled()
    })
  })

  describe('createClass（校管建班并指定班主任）', () => {
    it('缺必填字段时应抛出 "班级名称/年级/班主任必填"', async () => {
      await expect(
        service.createClass('school-1', { name: '', grade: '', classNo: '', headTeacher: '', headTeacherId: '' }),
      ).rejects.toThrow('班级名称/年级/班主任必填')
    })

    it('指定的班主任不在本校时应抛出异常', async () => {
      userRepo.findOne.mockResolvedValue(null) // 班主任查不到
      await expect(
        service.createClass('school-1', { name: '一班', grade: '一年级', classNo: '1', headTeacher: '张老师', headTeacherId: 't1' }),
      ).rejects.toThrow('指定的班主任不在本校')
    })

    it('该老师已是其他班班主任时应抛出 "一人只能担任一个班的班主任"（业务规则1：一师一班 head）', async () => {
      const teacher = { id: 't1', schoolId: 'school-1', name: '张老师' }
      userRepo.findOne.mockResolvedValue(teacher)
      classMemberSvc.assertTeacherNotHeadElsewhere.mockRejectedValue(
        new BadRequestException('该老师已是「二班」的班主任，一人只能担任一个班的班主任'),
      )
      await expect(
        service.createClass('school-1', { name: '一班', grade: '一年级', classNo: '1', headTeacher: '张老师', headTeacherId: 't1' }),
      ).rejects.toThrow('一人只能担任一个班的班主任')
      // 前置校验拦住：不应写入班级，也不应写入 head 记录
      expect(classRepo.save).not.toHaveBeenCalled()
      expect(classMemberSvc.addHeadTeacher).not.toHaveBeenCalled()
    })

    it('成功建班时应前置校验、写入 class_members head 记录并记审计日志', async () => {
      const teacher = { id: 't1', schoolId: 'school-1', name: '张老师' }
      userRepo.findOne.mockResolvedValue(teacher)
      const savedClass = { id: 'c1', name: '一班', grade: '一年级', classNo: '1', teacherId: 't1', headTeacher: '张老师' }
      classRepo.create.mockReturnValue(savedClass)
      classRepo.save.mockResolvedValue(savedClass)

      const res = await service.createClass('school-1', {
        name: '一班', grade: '一年级', classNo: '1', headTeacher: '张老师', headTeacherId: 't1', term: '2026春季',
      })

      // 返回保存的班级
      expect(res.id).toBe('c1')
      // 前置校验被调用（新班级尚无 id，excludeClassId 传空串，仅校验规则1；term 按学期隔离）
      expect(classMemberSvc.assertTeacherNotHeadElsewhere).toHaveBeenCalledWith('t1', '', '2026春季')
      // 写入 head 记录（含 term 和 subjects，subjects 默认空数组）
      expect(classMemberSvc.addHeadTeacher).toHaveBeenCalledWith('t1', 'c1', '一班', '2026春季', [])
      // 审计日志
      expect(audit.log).toHaveBeenCalledWith('school-1', 'create_class', '系统', '一班', expect.stringContaining('张老师'))
    })
  })

  describe('学期轮换场景（term 隔离：春季班主任→秋季任课老师）', () => {
    /** 搭建学期轮换场景：c1 班春季学期(t-old)是班主任，秋季要转给 t-new */
    function setupTermRotationScene(opts: { clsTerm?: string; newHead?: any } = {}) {
      const clsTerm = opts.clsTerm !== undefined ? opts.clsTerm : '2026春季'
      const cls = { id: 'c1', teacherId: 't-old', name: '一班', grade: '一年级', classNo: '1', headTeacher: '旧老师', term: clsTerm }
      classRepo.findOne.mockResolvedValue(cls)
      const oldTeacher = { id: 't-old', schoolId: 'school-1', name: '旧老师' }
      const newHead = opts.newHead === null ? null : (opts.newHead || { id: 't-new', schoolId: 'school-1', name: '新老师' })
      userRepo.findOne.mockImplementation((q: any) => {
        const id = q?.where?.id
        if (id === 't-old') return Promise.resolve(oldTeacher)
        if (id === 't-new') return Promise.resolve(newHead)
        return Promise.resolve(null)
      })
      const qb: any = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }
      classMemberRepo.createQueryBuilder.mockReturnValue(qb)
      classRepo.save.mockImplementation(async (c: any) => c)
      return { cls, qb }
    }

    it('转交班主任时 term 按班级当前学期传递（春季班级转交，term=2026春季）', async () => {
      const { qb } = setupTermRotationScene({ clsTerm: '2026春季' })
      await service.updateClass('school-1', 'c1', { headTeacherId: 't-new' })

      // term 应为班级当前学期 '2026春季'，而非空串
      expect(classMemberSvc.assertTeacherNotHeadElsewhere).toHaveBeenCalledWith('t-new', 'c1', '2026春季')
      expect(qb.where).toHaveBeenCalledWith('classId = :cid AND teacherId = :tid AND term = :term', { cid: 'c1', tid: 't-old', term: '2026春季' })
      expect(classMemberSvc.addHeadTeacher).toHaveBeenCalledWith('t-new', 'c1', '一班', '2026春季')
    })

    it('秋季学期转交班主任时 term=2026秋季，与春季互不影响（跨学期隔离）', async () => {
      const { qb } = setupTermRotationScene({ clsTerm: '2026秋季' })
      await service.updateClass('school-1', 'c1', { headTeacherId: 't-new' })

      // term 应为 '2026秋季'，春季的 head 记录不受影响
      expect(classMemberSvc.assertTeacherNotHeadElsewhere).toHaveBeenCalledWith('t-new', 'c1', '2026秋季')
      expect(qb.where).toHaveBeenCalledWith('classId = :cid AND teacherId = :tid AND term = :term', { cid: 'c1', tid: 't-old', term: '2026秋季' })
      expect(classMemberSvc.addHeadTeacher).toHaveBeenCalledWith('t-new', 'c1', '一班', '2026秋季')
    })

    it('建班时指定 term，前置校验和写入 head 记录均按该 term 隔离', async () => {
      const teacher = { id: 't1', schoolId: 'school-1', name: '张老师' }
      userRepo.findOne.mockResolvedValue(teacher)
      const savedClass = { id: 'c2', name: '二班', grade: '二年级', classNo: '1', teacherId: 't1', headTeacher: '张老师', term: '2026秋季' }
      classRepo.create.mockReturnValue(savedClass)
      classRepo.save.mockResolvedValue(savedClass)

      await service.createClass('school-1', {
        name: '二班', grade: '二年级', classNo: '1', headTeacher: '张老师', headTeacherId: 't1', term: '2026秋季',
      })

      // 同一老师在春季已是其他班 head，但秋季 term 不同，前置校验应通过（不抛异常）
      expect(classMemberSvc.assertTeacherNotHeadElsewhere).toHaveBeenCalledWith('t1', '', '2026秋季')
      expect(classMemberSvc.addHeadTeacher).toHaveBeenCalledWith('t1', 'c2', '二班', '2026秋季', [])
    })
  })

  describe('createClass 班主任兼任本班科任（subjects 支持）', () => {
    it('建班时指定 subjects 应传递给 addHeadTeacher（班主任可兼任本班数学+科学）', async () => {
      const teacher = { id: 't1', schoolId: 'school-1', name: '张老师' }
      userRepo.findOne.mockResolvedValue(teacher)
      const savedClass = { id: 'c1', name: '一班', grade: '一年级', classNo: '1', teacherId: 't1', headTeacher: '张老师', term: '2026春季' }
      classRepo.create.mockReturnValue(savedClass)
      classRepo.save.mockResolvedValue(savedClass)

      await service.createClass('school-1', {
        name: '一班', grade: '一年级', classNo: '1', headTeacher: '张老师', headTeacherId: 't1',
        term: '2026春季', subjects: ['数学', '科学'],
      })

      // subjects 应原样传递给 addHeadTeacher
      expect(classMemberSvc.addHeadTeacher).toHaveBeenCalledWith('t1', 'c1', '一班', '2026春季', ['数学', '科学'])
    })

    it('建班时未指定 subjects 应传空数组（班主任任教学科可后续自行更新）', async () => {
      const teacher = { id: 't1', schoolId: 'school-1', name: '张老师' }
      userRepo.findOne.mockResolvedValue(teacher)
      const savedClass = { id: 'c1', name: '一班', grade: '一年级', classNo: '1', teacherId: 't1', headTeacher: '张老师', term: '2026春季' }
      classRepo.create.mockReturnValue(savedClass)
      classRepo.save.mockResolvedValue(savedClass)

      await service.createClass('school-1', {
        name: '一班', grade: '一年级', classNo: '1', headTeacher: '张老师', headTeacherId: 't1', term: '2026春季',
      })

      expect(classMemberSvc.addHeadTeacher).toHaveBeenCalledWith('t1', 'c1', '一班', '2026春季', [])
    })
  })

  describe('toCsv（正确转义逗号/引号/换行）', () => {
    it('包含逗号的内容应被双引号包裹', () => {
      const csv = service.toCsv([['姓名', '备注'], ['张三', '你好,世界']])
      expect(csv).toBe('姓名,备注\n张三,"你好,世界"')
    })

    it('包含引号的内容应将引号转义为双引号并整体包裹', () => {
      const csv = service.toCsv([['姓名', '备注'], ['李四', '他说"嗨"']])
      expect(csv).toBe('姓名,备注\n李四,"他说""嗨"""')
    })

    it('包含换行的内容应被双引号包裹', () => {
      const csv = service.toCsv([['姓名', '备注'], ['王五', '第一行\n第二行']])
      expect(csv).toBe('姓名,备注\n王五,"第一行\n第二行"')
    })

    it('普通内容无需转义', () => {
      const csv = service.toCsv([['姓名', '年龄'], ['赵六', '18']])
      expect(csv).toBe('姓名,年龄\n赵六,18')
    })

    it('综合混合内容', () => {
      const csv = service.toCsv([
        ['姓名', '备注'],
        ['张三', '你好,世界'],
        ['李四', '他说"嗨"'],
        ['王五', '第一行\n第二行'],
        ['赵六', '正常'],
      ])
      expect(csv).toBe(
        '姓名,备注\n' +
          '张三,"你好,世界"\n' +
          '李四,"他说""嗨"""\n' +
          '王五,"第一行\n第二行"\n' +
          '赵六,正常',
      )
    })

    it('数字与空值也应正确处理', () => {
      // toCsv 内部用 String(c) 兜底，数字会被转成字符串
      const csv = service.toCsv([['a', 'b'], [1, '']] as any)
      expect(csv).toBe('a,b\n1,')
    })
  })
})
