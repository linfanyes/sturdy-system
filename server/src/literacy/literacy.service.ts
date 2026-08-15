import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { LiteracyLesson, LiteracyBadge } from './literacy.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'

@Injectable()
export class LiteracyService {
  constructor(
    @InjectRepository(LiteracyLesson) private readonly lessonRepo: Repository<LiteracyLesson>,
    @InjectRepository(LiteracyBadge) private readonly badgeRepo: Repository<LiteracyBadge>,
    @InjectRepository(Student) private readonly stuRepo: Repository<Student>,
    @InjectRepository(ClassItem) private readonly clsRepo: Repository<ClassItem>,
  ) {}

  private async resolveTeacherId(studentId: string): Promise<{ teacherId: string; classId: string }> {
    const stu = await this.stuRepo.findOne({ where: { id: studentId } } as any)
    if (!stu) throw new BadRequestException('学生不存在')
    const cls = await this.clsRepo.findOne({ where: { id: (stu as any).classId } } as any)
    if (!cls) throw new BadRequestException('班级不存在')
    return { teacherId: (cls as any).teacherId, classId: (stu as any).classId }
  }

  /** 微课列表（可按分类过滤） */
  async listLessons(category?: string) {
    const where: any = {}
    if (category) where.category = category
    return this.lessonRepo.find({ where, order: { sort: 'ASC', createdAt: 'ASC' } } as any)
  }

  /** 完成微课得徽章（同微课只记一次） */
  async complete(lessonId: string, studentId: string) {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } } as any)
    if (!lesson) throw new BadRequestException('微课不存在')
    const { teacherId, classId } = await this.resolveTeacherId(studentId)
    const exist = await this.badgeRepo.findOne({ where: { lessonId, studentId } } as any)
    if (exist) return { badged: false, lesson }
    const badge = this.badgeRepo.create({
      lessonId,
      studentId,
      teacherId,
      classId,
      completedAt: new Date().toISOString().slice(0, 10),
    } as any)
    await this.badgeRepo.save(badge as any)
    return { badged: true, lesson }
  }

  /** 我的徽章（家长/学生端） */
  async myBadges(studentId: string) {
    const badges = await this.badgeRepo.find({ where: { studentId } as any, order: { createdAt: 'DESC' } } as any)
    const lessonIds = badges.map((b: any) => b.lessonId)
    const lessons = lessonIds.length ? await this.lessonRepo.find({ where: { id: In(lessonIds) } } as any) : []
    const map = new Map((lessons as any[]).map((l) => [l.id, l]))
    return badges.map((b: any) => ({ ...b, lesson: map.get(b.lessonId) || null }))
  }

  /** 班级徽章统计（教师端） */
  async classBadges(teacherId: string, classId: string) {
    const badges = await this.badgeRepo.find({ where: { teacherId, classId } } as any)
    const byLessonMap = new Map<string, number>()
    const stuCount = new Map<string, number>()
    for (const b of badges as any[]) {
      byLessonMap.set(b.lessonId, (byLessonMap.get(b.lessonId) || 0) + 1)
      stuCount.set(b.studentId, (stuCount.get(b.studentId) || 0) + 1)
    }
    const lessonIds = [...byLessonMap.keys()]
    const lessons = lessonIds.length ? await this.lessonRepo.find({ where: { id: In(lessonIds) } } as any) : []
    const lessonMap = new Map((lessons as any[]).map((l) => [l.id, l]))
    const byLesson = lessonIds.map((id) => ({
      lessonId: id,
      title: (lessonMap.get(id) as any)?.title || '',
      count: byLessonMap.get(id),
    }))
    const students = await this.stuRepo.find({ where: { classId, teacherId } } as any)
    const nameMap = new Map((students as any[]).map((s) => [s.id, s.name]))
    const topStudents = [...stuCount.entries()]
      .map(([sid, c]) => ({ studentId: sid, studentName: nameMap.get(sid) || '未知', count: c }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    return { byLesson, topStudents }
  }

  /** 首次启动时预置默认微课（数字素养 / 网络安全 / 生涯启蒙） */
  async seedIfEmpty() {
    const count = await this.lessonRepo.count()
    if (count > 0) return
    const seed = [
      { category: 'digital_literacy', title: '认识数字设备与信息', content: '手机、平板、电脑都是数字设备；信息可以是文字、图片、声音和视频。学会区分“设备”和“信息”，是数字素养的第一步。', duration: 5, sort: 1 },
      { category: 'digital_literacy', title: '搜索与辨别真伪', content: '用关键词搜索能更快找到答案；看到惊人的消息，先查证来源，不轻易相信、不随手转发。', duration: 6, sort: 2 },
      { category: 'online_safety', title: '保护个人信息', content: '姓名、学校、住址、密码属于个人隐私，不要告诉网友；设置只有家人和老师知道的强密码。', duration: 5, sort: 3 },
      { category: 'online_safety', title: '拒绝网络欺凌', content: '不嘲笑、不孤立他人；遇到不友善的言论，截图保留证据，及时告诉信任的大人。', duration: 5, sort: 4 },
      { category: 'career', title: '我的兴趣与特长', content: '你喜欢做什么？擅长什么？把兴趣变成小目标，是认识未来职业的好开始。', duration: 5, sort: 5 },
      { category: 'career', title: '职业万花筒', content: '医生、工程师、设计师、农民……每种职业都在让世界更好。了解它们，找到自己想成为的样子。', duration: 6, sort: 6 },
    ]
    await this.lessonRepo.save(seed.map((s: any) => this.lessonRepo.create(s)) as any)
  }
}
