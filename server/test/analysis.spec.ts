import 'reflect-metadata'
import fs from 'fs'
import path from 'path'
import { AnalysisService } from '../src/analysis/analysis.service'
import { AnalysisController } from '../src/analysis/analysis.controller'

/**
 * 学生成长分析（Task A）验证
 *
 * 验证目标：
 * - 三个接口存在（student-trend / class-trend / subject-strength）
 * - AnalysisModule 在 AppModule 中注册
 * - 服务基本聚合逻辑正确（不连库，用 mock repo）
 */

function mockRepo(): any {
  const repo: any = {}
  repo.findOne = jest.fn()
  repo.find = jest.fn()
  repo.count = jest.fn()
  return repo
}

describe('学生成长分析（Analysis）', () => {
  // ========== 源码结构断言 ==========
  describe('源码结构：模块/接口存在', () => {
    it('AnalysisController 应提供三个 GET 接口', () => {
      const src = fs.readFileSync(
        path.resolve(__dirname, '../src/analysis/analysis.controller.ts'),
        'utf8',
      )
      expect(src).toMatch(/@Controller\('analysis'\)/)
      expect(src).toMatch(/@Get\('student-trend'\)/)
      expect(src).toMatch(/@Get\('class-trend'\)/)
      expect(src).toMatch(/@Get\('subject-strength'\)/)
      // 三个接口均使用 JwtAuthGuard
      expect(src).toMatch(/@UseGuards\(JwtAuthGuard\)/)
    })

    it('AnalysisService 应提供三个核心方法', () => {
      const src = fs.readFileSync(
        path.resolve(__dirname, '../src/analysis/analysis.service.ts'),
        'utf8',
      )
      expect(src).toMatch(/export class AnalysisService/)
      expect(src).toMatch(/async studentTrend/)
      expect(src).toMatch(/async classTrend/)
      expect(src).toMatch(/async subjectStrength/)
    })

    it('AnalysisModule 应在 AppModule 中注册', () => {
      const appSrc = fs.readFileSync(
        path.resolve(__dirname, '../src/app.module.ts'),
        'utf8',
      )
      expect(appSrc).toMatch(/import.*AnalysisModule.*from.*analysis\/analysis\.module/)
      expect(appSrc).toMatch(/AnalysisModule/)
    })
  })

  // ========== 行为验证（不连库） ==========
  describe('行为验证：聚合逻辑正确', () => {
    let examRepo: any
    let gradeRepo: any
    let studentRepo: any
    let classRepo: any
    let service: AnalysisService

    beforeEach(() => {
      examRepo = mockRepo()
      gradeRepo = mockRepo()
      studentRepo = mockRepo()
      classRepo = mockRepo()
      service = new AnalysisService(examRepo, gradeRepo, studentRepo, classRepo)
    })

    it('classTrend 应正确计算均分/及格率/优秀率/参加人数', async () => {
      classRepo.findOne.mockResolvedValue({ id: 'cls-1', name: '一班' })
      examRepo.find.mockResolvedValue([
        {
          id: 'exam1', name: '期中', date: '2024-04-01', term: '2024春',
          subjectFullScores: { 语文: 100 },
        },
      ])
      gradeRepo.find.mockResolvedValue([
        {
          examId: 'exam1', subject: '语文',
          scores: [
            { studentId: 's1', score: 90 },
            { studentId: 's2', score: 80 },
            { studentId: 's3', score: 50 },
          ],
        },
      ])

      const res = await service.classTrend('cls-1')
      expect(res.className).toBe('一班')
      expect(res.points).toHaveLength(1)
      const p = res.points[0]
      expect(p.subject).toBe('语文')
      // 均分 = (90+80+50)/3 = 73.33
      expect(p.avg).toBe(73.3)
      // 及格率：≥60 的有 2 人 → 0.667
      expect(p.passRate).toBe(0.667)
      // 优秀率：≥85 的有 1 人 → 0.333
      expect(p.excellentRate).toBe(0.333)
      expect(p.studentCount).toBe(3)
    })

    it('studentTrend 无 subject 时应返回总分/均分/排名曲线', async () => {
      studentRepo.findOne.mockResolvedValue({ id: 's1', name: '小明' })
      classRepo.findOne.mockResolvedValue({ id: 'cls-1', name: '一班' })
      examRepo.find.mockResolvedValue([
        { id: 'exam1', name: '期中', date: '2024-04-01', term: '2024春' },
      ])
      gradeRepo.find.mockResolvedValue([
        {
          examId: 'exam1', subject: '语文',
          scores: [
            { studentId: 's1', score: 90 },
            { studentId: 's2', score: 80 },
          ],
        },
        {
          examId: 'exam1', subject: '数学',
          scores: [
            { studentId: 's1', score: 70 },
            { studentId: 's2', score: 60 },
          ],
        },
      ])
      studentRepo.count.mockResolvedValue(2)

      const res = await service.studentTrend('s1', 'cls-1')
      expect(res.studentName).toBe('小明')
      expect(res.points).toHaveLength(1)
      const p = res.points[0]
      // 总分 = 90 + 70 = 160
      expect(p.total).toBe(160)
      // 班级该科均分 = (语文均85 + 数学均65)/2 = 75
      expect(p.subjectAvg).toBe(75)
      // 排名：s1 总分最高 → 1
      expect(p.rank).toBe(1)
      expect(p.subjectRanks['语文']).toBe(1)
      expect(p.subjectRanks['数学']).toBe(1)
    })

    it('studentTrend 提供 subject 时应只返回该科曲线', async () => {
      studentRepo.findOne.mockResolvedValue({ id: 's1', name: '小明' })
      classRepo.findOne.mockResolvedValue({ id: 'cls-1', name: '一班' })
      examRepo.find.mockResolvedValue([
        { id: 'exam1', name: '期中', date: '2024-04-01', term: '2024春' },
      ])
      gradeRepo.find.mockResolvedValue([
        {
          examId: 'exam1', subject: '语文',
          scores: [
            { studentId: 's1', score: 90 },
            { studentId: 's2', score: 80 },
          ],
        },
      ])
      studentRepo.count.mockResolvedValue(2)

      const res = await service.studentTrend('s1', 'cls-1', '语文')
      expect(res.points).toHaveLength(1)
      const p = res.points[0]
      expect(p.score).toBe(90)
      expect(p.classAvg).toBe(85)
      expect(p.rank).toBe(1)
      expect(p.total).toBeUndefined()
    })

    it('subjectStrength 应返回班级/全校均分对比', async () => {
      classRepo.findOne.mockResolvedValue({ id: 'cls-1', name: '一班' })
      gradeRepo.find.mockResolvedValueOnce([
        {
          examId: 'exam1', subject: '语文',
          scores: [
            { studentId: 's1', score: 90 },
            { studentId: 's2', score: 80 },
          ],
        },
      ])
      // 全校成绩（本班 + 其他班）
      gradeRepo.find.mockResolvedValue([
        {
          examId: 'exam1', subject: '语文',
          scores: [
            { studentId: 's1', score: 90 },
            { studentId: 's2', score: 80 },
          ],
        },
        {
          examId: 'exam1', subject: '语文',
          scores: [
            { studentId: 's3', score: 70 },
          ],
        },
      ])
      examRepo.find.mockResolvedValue([
        { id: 'exam1', subjectFullScores: { 语文: 120 } },
      ])

      const res = await service.subjectStrength('cls-1')
      expect(res.className).toBe('一班')
      expect(res.subjects).toHaveLength(1)
      const s = res.subjects[0]
      expect(s.subject).toBe('语文')
      expect(s.classAvg).toBe(85)
      // 全校均分 = (90+80+70)/3 = 80
      expect(s.gradeAvg).toBe(80)
      expect(s.delta).toBe(5)
      expect(s.fullScore).toBe(120)
    })

    it('学生不存在时应抛出 BadRequestException', async () => {
      studentRepo.findOne.mockResolvedValue(null)
      await expect(service.studentTrend('x', 'cls-1')).rejects.toThrow()
    })
  })
})