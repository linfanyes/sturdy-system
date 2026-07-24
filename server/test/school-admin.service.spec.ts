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
