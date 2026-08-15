import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { HabitChallenge, HabitCheckin } from './habit.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'

@Injectable()
export class HabitService {
  constructor(
    @InjectRepository(HabitChallenge) private readonly chalRepo: Repository<HabitChallenge>,
    @InjectRepository(HabitCheckin) private readonly ckRepo: Repository<HabitCheckin>,
    @InjectRepository(Student) private readonly stuRepo: Repository<Student>,
    @InjectRepository(ClassItem) private readonly clsRepo: Repository<ClassItem>,
  ) {}

  private async resolveTeacherId(studentId: string): Promise<{ teacherId: string; classId: string; studentName: string }> {
    const stu = await this.stuRepo.findOne({ where: { id: studentId } } as any)
    if (!stu) throw new BadRequestException('学生不存在')
    const cls = await this.clsRepo.findOne({ where: { id: (stu as any).classId } } as any)
    if (!cls) throw new BadRequestException('班级不存在')
    return { teacherId: (cls as any).teacherId, classId: (stu as any).classId, studentName: (stu as any).name }
  }

  /** 计算连续打卡天数（从最近打卡日向前连续计数） */
  private computeStreak(dates: string[]): number {
    if (!dates.length) return 0
    const set = new Set(dates)
    const sorted = [...dates].sort().reverse()
    let streak = 0
    let cursor = new Date(sorted[0])
    while (set.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }

  /** 发起挑战（教师/家长） */
  async createChallenge(ownerId: string, role: 'teacher' | 'parent', body: any) {
    let teacherId = ownerId
    let classId: string | null = body?.classId ?? null
    let studentId: string | null = null
    if (role === 'parent') {
      const r = await this.resolveTeacherId(ownerId)
      teacherId = r.teacherId
      studentId = ownerId
      classId = r.classId
    }
    const chal = this.chalRepo.create({
      type: body?.type || 'reading',
      title: body?.title || '习惯养成挑战',
      targetDays: body?.targetDays || 21,
      teacherId,
      classId,
      studentId,
      createdByRole: role,
      startDate: new Date().toISOString().slice(0, 10),
      note: body?.note || null,
    } as any)
    return this.chalRepo.save(chal as any)
  }

  /** 我的挑战（家长/学生端，含打卡统计） */
  async myChallenges(studentId: string) {
    const list = await this.chalRepo.find({ where: { studentId } as any, order: { createdAt: 'DESC' } } as any)
    const ids = list.map((c: any) => c.id)
    const checkins = ids.length
      ? await this.ckRepo.find({ where: { challengeId: In(ids), studentId } } as any)
      : []
    return list.map((c: any) => {
      const dates = checkins.filter((k: any) => k.challengeId === c.id).map((k: any) => k.date)
      const total = dates.length
      const streak = this.computeStreak(dates)
      return {
        ...c,
        totalCheckins: total,
        streak,
        progress: Math.min(100, Math.round((total / (c.targetDays || 21)) * 100)),
        lastCheckinDate: dates.length ? [...dates].sort().reverse()[0] : null,
      }
    })
  }

  /** 班级挑战（教师端） */
  async classChallenges(teacherId: string, classId: string) {
    return this.chalRepo.find({ where: { teacherId, classId } as any, order: { createdAt: 'DESC' } } as any)
  }

  /** 打卡（同日去重，先查后更新或插入） */
  async checkin(challengeId: string, studentId: string, body: any) {
    const chal = await this.chalRepo.findOne({ where: { id: challengeId } } as any)
    if (!chal) throw new BadRequestException('挑战不存在')
    const date = new Date().toISOString().slice(0, 10)
    const exist = await this.ckRepo.findOne({ where: { challengeId, studentId, date } } as any)
    if (exist) {
      exist.note = body?.note || exist.note
      return this.ckRepo.save(exist as any)
    }
    const ck = this.ckRepo.create({
      challengeId,
      studentId,
      teacherId: (chal as any).teacherId,
      classId: (chal as any).classId,
      date,
      note: body?.note || null,
    } as any)
    return this.ckRepo.save(ck as any)
  }

  /** 班级打卡排行榜（按累计打卡数 / 连续天数） */
  async ranking(teacherId: string, classId: string) {
    const list = await this.ckRepo.find({ where: { teacherId, classId } } as any)
    const map = new Map<string, { studentId: string; total: number; dates: Set<string> }>()
    for (const c of list as any[]) {
      if (!map.has(c.studentId)) map.set(c.studentId, { studentId: c.studentId, total: 0, dates: new Set() })
      const e = map.get(c.studentId)!
      e.total++
      e.dates.add(c.date)
    }
    const students = await this.stuRepo.find({ where: { classId, teacherId } } as any)
    const nameMap = new Map((students as any[]).map((s) => [s.id, s.name]))
    const rows = [...map.values()].map((e) => ({
      studentId: e.studentId,
      studentName: nameMap.get(e.studentId) || '未知',
      total: e.total,
      streak: this.computeStreak([...e.dates]),
    }))
    rows.sort((a, b) => b.total - a.total || b.streak - a.streak)
    return rows.slice(0, 20)
  }
}
