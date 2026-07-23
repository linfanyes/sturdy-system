import 'reflect-metadata'
import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { ParentAuthService } from '../src/parent-auth/parent-auth.service'

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

describe('ParentAuthService', () => {
  let service: ParentAuthService
  let pcRepo: any
  let studentRepo: any
  let noticeRepo: any
  let homeworkRepo: any
  let gradeRepo: any
  let examRepo: any
  let classRepo: any
  let jwt: any
  let im: any
  let config: any
  let wechat: any

  beforeEach(() => {
    pcRepo = mockRepo()
    studentRepo = mockRepo()
    noticeRepo = mockRepo()
    homeworkRepo = mockRepo()
    gradeRepo = mockRepo()
    examRepo = mockRepo()
    classRepo = mockRepo()
    jwt = { sign: jest.fn().mockReturnValue('token-abc') }
    im = { getUserSig: jest.fn().mockResolvedValue({ sdkAppId: '1', userSig: 'sig' }) }
    config = { get: jest.fn() }
    wechat = { code2Session: jest.fn() }
    service = new ParentAuthService(
      pcRepo,
      studentRepo,
      noticeRepo,
      homeworkRepo,
      gradeRepo,
      examRepo,
      classRepo,
      jwt as any,
      im as any,
      config as any,
      wechat as any,
    )
  })

  describe('login（密码校验修复：原来无密码可登录，现在要求密码）', () => {
    const stubStudent = {
      id: 'stu-1',
      name: '小明',
      classId: 'cls-1',
      studentNo: '20240001',
      parentName: '张爸爸',
      parentLoginEnabled: true,
    }

    it('空密码应抛出 BadRequestException "请输入密码"', async () => {
      await expect(service.login('20240001', '')).rejects.toThrow('请输入密码')
      await expect(service.login('20240001', '')).rejects.toThrow(BadRequestException)
    })

    it('错误密码应抛出 UnauthorizedException "密码错误"（而非 BadRequest）', async () => {
      studentRepo.findOne.mockResolvedValue({ ...stubStudent })
      // 类型必须是 UnauthorizedException（安全修复关键点）
      await expect(service.login('20240001', 'wrong')).rejects.toThrow(UnauthorizedException)
      await expect(service.login('20240001', 'wrong')).rejects.toThrow('密码错误')
    })

    it('正确学号 + 正确密码(123456) 返回 token', async () => {
      studentRepo.findOne.mockResolvedValue({ ...stubStudent })
      jwt.sign.mockReturnValue('token-xyz')

      const res = await service.login('20240001', '123456')

      expect(res.token).toBe('token-xyz')
      expect(res.parent.studentId).toBe('stu-1')
      expect(res.parent.studentName).toBe('小明')
      expect(res.parent.classId).toBe('cls-1')
      expect(res.parent.studentNo).toBe('20240001')
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: expect.any(String),
          type: 'parent',
          studentId: 'stu-1',
          studentName: '小明',
          classId: 'cls-1',
          studentNo: '20240001',
        }),
      )
    })

    it('学号不存在应抛出 BadRequestException', async () => {
      studentRepo.findOne.mockResolvedValue(null)
      await expect(service.login('99999999', '123456')).rejects.toThrow(BadRequestException)
      await expect(service.login('99999999', '123456')).rejects.toThrow('未找到该学号')
    })

    it('parentLoginEnabled=false 应抛出 BadRequestException', async () => {
      studentRepo.findOne.mockResolvedValue({ ...stubStudent, parentLoginEnabled: false })
      await expect(service.login('20240001', '123456')).rejects.toThrow(BadRequestException)
      await expect(service.login('20240001', '123456')).rejects.toThrow('尚未被老师授权')
    })

    it('非数字学号应抛出 BadRequestException "请输入正确的学号"', async () => {
      await expect(service.login('abc', '123456')).rejects.toThrow('请输入正确的学号')
      await expect(service.login('abc', '123456')).rejects.toThrow(BadRequestException)
    })

    it('空学号也应抛出 "请输入正确的学号"', async () => {
      await expect(service.login('', '123456')).rejects.toThrow('请输入正确的学号')
    })
  })

  describe('getExams', () => {
    it('无 classId 时返回空数组 { exams: [] }', async () => {
      const res = await service.getExams({})
      expect(res).toEqual({ exams: [] })

      const res2 = await service.getExams({ classId: '', studentId: 's1' })
      expect(res2).toEqual({ exams: [] })

      // 不应查询数据库
      expect(examRepo.find).not.toHaveBeenCalled()
      expect(gradeRepo.find).not.toHaveBeenCalled()
    })

    it('无 studentId 时也返回空数组', async () => {
      const res = await service.getExams({ classId: 'c1' })
      expect(res).toEqual({ exams: [] })
    })

    it('buildDistribution 间接测试：通过 getExams 验证 10 分一段分布与 isStudent 标记', async () => {
      // buildDistribution 为模块私有函数（未 export），此处通过 getExams 间接验证其逻辑
      examRepo.find.mockResolvedValue([
        {
          id: 'exam1',
          name: '期中',
          date: '2024-04-01',
          term: '2024春',
          subjectFullScores: { 语文: 100 },
          analysisNote: '',
        },
      ])
      gradeRepo.find.mockResolvedValue([
        {
          examId: 'exam1',
          subject: '语文',
          scores: [
            { studentId: 's1', score: 85 },
            { studentId: 's2', score: 95 },
          ],
        },
      ])
      studentRepo.find.mockResolvedValue([{ id: 's1' }, { id: 's2' }])

      const res = await service.getExams({ classId: 'c1', studentId: 's1' })

      expect(res.exams).toHaveLength(1)
      const exam = res.exams[0]
      expect(exam.examName).toBe('期中')
      expect(exam.totalScore).toBe(85)
      expect(exam.totalFullScore).toBe(100)
      // 总分排名：s2(95) > s1(85) → s1 第 2 名
      expect(exam.classRank).toBe(2)
      // 语文单科排名：s2(95) > s1(85) → s1 第 2 名
      expect(exam.subjects[0].classRank).toBe(2)

      // buildDistribution 输出：85 落在 80-89 段，95 落在 90-99 段
      expect(exam.distribution).toEqual([
        { label: '80-89', count: 1, pct: 100, isStudent: true },
        { label: '90-99', count: 1, pct: 100, isStudent: false },
      ])
    })

    it('buildDistribution：空分数返回空数组', async () => {
      examRepo.find.mockResolvedValue([
        {
          id: 'exam2',
          name: '月考',
          date: '2024-05-01',
          term: '2024春',
          subjectFullScores: {},
          analysisNote: null,
        },
      ])
      gradeRepo.find.mockResolvedValue([])
      studentRepo.find.mockResolvedValue([])

      const res = await service.getExams({ classId: 'c1', studentId: 's1' })
      expect(res.exams).toHaveLength(1)
      // 无任何成绩 → distribution 为空
      expect(res.exams[0].distribution).toEqual([])
      expect(res.exams[0].totalScore).toBeNull()
    })
  })
})
