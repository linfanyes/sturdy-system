import 'reflect-metadata'
import { DataSource } from 'typeorm'
import {
  ParentCodingController,
  CodingGalleryController,
  CodingReviewController,
  KidsCodingAdminController,
} from './kids-coding.module'
import { CodingProject } from './kids-coding.entity'
import { CodingChallenge } from './challenge.entity'
import { CodingReview } from './review.entity'
import { CodingBadge } from './badge.entity'

jest.setTimeout(30000)

/**
 * 端到端集成测试：直接 new 控制器 + 注入真实 TypeORM Repository（连 MySQL 8.4 容器），
 * 绕过 JWT 守卫（直接传入模拟的 @CurrentParent / @CurrentTeacher 对象），
 * 验证 kids-coding 特有的数据隔离、提交闭环、点评 upsert、作品墙、周报统计、徽章规则等真实逻辑。
 */
describe('kids-coding 端到端集成', () => {
  let ds: DataSource
  let projectRepo: any, challengeRepo: any, reviewRepo: any, badgeRepo: any
  let fakeMsg: any
  let parentCtrl: ParentCodingController
  let galleryCtrl: CodingGalleryController
  let reviewCtrl: CodingReviewController
  let adminCtrl: KidsCodingAdminController

  beforeAll(async () => {
    ds = new DataSource({
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      username: 'root',
      password: 'testpass',
      database: 'gardener',
      entities: [CodingProject, CodingChallenge, CodingReview, CodingBadge],
      synchronize: true,
      logging: false,
    })
    await ds.initialize()
    projectRepo = ds.getRepository(CodingProject)
    challengeRepo = ds.getRepository(CodingChallenge)
    reviewRepo = ds.getRepository(CodingReview)
    badgeRepo = ds.getRepository(CodingBadge)
    fakeMsg = { send: jest.fn().mockResolvedValue({ id: 'm1' }) }
    parentCtrl = new ParentCodingController(projectRepo, challengeRepo, reviewRepo, badgeRepo, fakeMsg)
    galleryCtrl = new CodingGalleryController(projectRepo, challengeRepo)
    reviewCtrl = new CodingReviewController(reviewRepo, projectRepo)
    adminCtrl = new KidsCodingAdminController(projectRepo, reviewRepo, challengeRepo, fakeMsg)
  })

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy()
  })

  beforeEach(async () => {
    await Promise.all([
      projectRepo.clear(),
      challengeRepo.clear(),
      reviewRepo.clear(),
      badgeRepo.clear(),
    ])
  })

  const mkChallenge = (over: any = {}) =>
    challengeRepo.save(challengeRepo.create({ title: '挑战', classId: 'c1', teacherId: 't1', ...over }))
  const mkProject = (over: any = {}) =>
    projectRepo.save(projectRepo.create({ title: '作品', teacherId: null, studentId: null, ...over }))

  it('A 家长挑战按班级隔离', async () => {
    const c1 = await mkChallenge({ classId: 'c1' })
    await mkChallenge({ classId: 'c2' })
    const list = await parentCtrl.listChallenges({ classId: 'c1' } as any)
    expect(list.map((x: any) => x.id)).toEqual([c1.id])
    expect(await parentCtrl.listChallenges({ classId: null } as any)).toEqual([])
  })

  it('B 练习按 studentId 隔离 + 提交闭环 + 越权拒绝', async () => {
    const p1 = await parentCtrl.createMine({ title: 'm1', blocks: [] } as any, { studentId: 's1' } as any)
    await parentCtrl.createMine({ title: 'm2', blocks: [] } as any, { studentId: 's2' } as any)
    const mine1 = await parentCtrl.listMine({ studentId: 's1' } as any)
    expect(mine1).toHaveLength(1)
    expect(mine1[0].id).toBe(p1.id)
    await parentCtrl.submitMine(p1.id, { studentId: 's1' } as any)
    expect((await parentCtrl.listMine({ studentId: 's1' } as any))[0].submitted).toBe(true)
    // 越权：s2 操作 s1 作品应 404
    await expect(parentCtrl.submitMine(p1.id, { studentId: 's2' } as any)).rejects.toThrow()
  })

  it('C 教师点评 upsert + 家长回看', async () => {
    const p = await parentCtrl.createMine({ title: 'm', blocks: [] } as any, { studentId: 's1' } as any)
    expect(await parentCtrl.getReview(p.id, { studentId: 's1' } as any)).toBeNull()
    await reviewCtrl.create({ projectId: p.id, rating: 5, comment: '好' } as any, { sub: 't1', id: 't1' } as any)
    expect((await parentCtrl.getReview(p.id, { studentId: 's1' } as any)).rating).toBe(5)
    await reviewCtrl.create({ projectId: p.id, rating: 4 } as any, { sub: 't1', id: 't1' } as any)
    expect((await parentCtrl.getReview(p.id, { studentId: 's1' } as any)).rating).toBe(4)
  })

  it('D 班级作品墙 精选/取消 + 只读可见性', async () => {
    const ch = await mkChallenge({ classId: 'c1' })
    const proj = await mkProject({ title: 'art', studentId: 's1', challengeId: ch.id, showInGallery: true })
    let wall = await parentCtrl.classGallery({ classId: 'c1' } as any)
    expect(wall.map((x: any) => x.id)).toEqual([proj.id])
    proj.showInGallery = false
    await projectRepo.save(proj)
    expect(await parentCtrl.classGallery({ classId: 'c1' } as any)).toEqual([])
    await galleryCtrl.feature(proj.id, { sub: 't1', id: 't1' } as any)
    expect((await projectRepo.findOne({ where: { id: proj.id } } as any)).showInGallery).toBe(true)
    await galleryCtrl.unfeature(proj.id, { sub: 't1', id: 't1' } as any)
    expect((await projectRepo.findOne({ where: { id: proj.id } } as any)).showInGallery).toBe(false)
  })

  it('E 家长周报统计', async () => {
    const a = await mkProject({ studentId: 's1', submitted: true, blocks: [1, 2] })
    const b = await mkProject({ studentId: 's1', submitted: true, blocks: [1, 2, 3] })
    await mkProject({ studentId: 's1', submitted: false, blocks: [1, 2, 3, 4, 5] })
    await reviewRepo.save(reviewRepo.create({ projectId: a.id, studentId: 's1', rating: 4, done: true } as any))
    await reviewRepo.save(reviewRepo.create({ projectId: b.id, studentId: 's1', rating: 5, done: true } as any))
    const rep = await parentCtrl.weeklyReport({ studentId: 's1', classId: 'c1' } as any)
    expect(rep.practiceTotal).toBe(3)
    expect(rep.submittedTotal).toBe(2)
    expect(rep.totalBlocks).toBe(10)
    expect(rep.reviewsTotal).toBe(2)
    expect(rep.avgRating).toBe(4.5)
  })

  it('F 成就徽章 规则计算 + 幂等落库', async () => {
    for (let i = 1; i <= 5; i++) await mkProject({ studentId: 's1', submitted: i <= 3, blocks: [1] })
    const one = await mkProject({ studentId: 's1', submitted: true, blocks: [1] })
    await reviewRepo.save(reviewRepo.create({ projectId: one.id, studentId: 's1', rating: 5, done: true } as any))
    const badges = await parentCtrl.getBadges({ studentId: 's1' } as any)
    const earned = badges.filter((b: any) => b.earned).map((b: any) => b.type)
    expect(earned).toEqual(
      expect.arrayContaining(['first_practice', 'first_submit', 'five_practices', 'star_5', 'challenge_master']),
    )
    const count1 = await badgeRepo.count({ where: { studentId: 's1' } } as any)
    await parentCtrl.getBadges({ studentId: 's1' } as any)
    const count2 = await badgeRepo.count({ where: { studentId: 's1' } } as any)
    expect(count2).toBe(count1)
  })

  it('G 周报手动推送写入站内信', async () => {
    await mkProject({ studentId: 's1', submitted: true, blocks: [1, 2] })
    await mkProject({ studentId: 's1', submitted: true, blocks: [1, 2, 3] })
    const res = await parentCtrl.pushWeeklyReport({ studentId: 's1', classId: 'c1' } as any)
    expect(res.pushed).toBe(true)
    expect(fakeMsg.send).toHaveBeenCalledTimes(1)
    const call = fakeMsg.send.mock.calls[0]
    expect(call[0]).toBe('system')
    expect(call[2].recipientId).toBe('s1')
    expect(call[2].recipientRole).toBe('parent')
    expect(call[2].type).toBe('coding_weekly')
    expect(call[2].content).toContain('2 份')
    // 无练习数据时返回未推送
    const none = await parentCtrl.pushWeeklyReport({ studentId: 's-no-data', classId: 'c1' } as any)
    expect(none.pushed).toBe(false)
  })

  it('H 超管批量推送遍历有活动学生', async () => {
    fakeMsg.send.mockClear()
    await mkProject({ studentId: 'sA', submitted: true, blocks: [1] })
    await mkProject({ studentId: 'sA', submitted: true, blocks: [1, 2] })
    await mkProject({ studentId: 'sB', submitted: false, blocks: [1] })
    const res = await adminCtrl.pushAllWeeklyReports()
    expect(res.scanned).toBe(2)
    expect(res.pushed).toBe(2)
    expect(fakeMsg.send).toHaveBeenCalledTimes(2)
  })
})
