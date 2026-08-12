import { Injectable, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Student } from '../students/student.entity'
import { User } from '../users/user.entity'
import { ClassItem } from '../classes/class.entity'
import { Notice, Homework } from '../school/school.entity'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { Checkin } from '../checkin/checkin.module'
import { ScheduleItem } from '../school/school.entity'
import { BehaviorRecord } from '../growth/growth.entity'
import { DutyRoster } from '../duty-roster/duty.entity'
import { ClassMember } from '../class-members/class-member.entity'
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { CacheService } from '../common/cache/cache.service'
import { StudentParentService } from '../student-parent/student-parent.module'
import { findStudentByNoForLogin } from '../common/utils/student.util'

/**
 * 家长端只读查询服务。
 * 封装所有家长视角的数据读取逻辑（成绩、考勤、行为、课表、作业、通知等），
 * 供 ParentAuthService 及其他可能的调用方复用。
 */
@Injectable()
export class ParentQueryService {
  private readonly EXAM_CACHE_TTL = 60 * 1000  // 1 分钟缓存（缩短缓存时间，提高数据实时性）
  private readonly MAX_RECENT_EXAMS = 10  // 最多返回最近 10 次考试

  constructor(
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(ParentContact) private readonly pcRepo: Repository<ParentContact>,
    @InjectRepository(Notice) private readonly noticeRepo: Repository<Notice>,
    @InjectRepository(Homework) private readonly homeworkRepo: Repository<Homework>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
    @InjectRepository(Checkin) private readonly checkinRepo: Repository<Checkin>,
    @InjectRepository(ScheduleItem) private readonly scheduleRepo: Repository<ScheduleItem>,
    @InjectRepository(BehaviorRecord) private readonly behaviorRepo: Repository<BehaviorRecord>,
    @InjectRepository(DutyRoster) private readonly dutyRepo: Repository<DutyRoster>,
    @InjectRepository(ClassMember) private readonly classMemberRepo: Repository<ClassMember>,
    private readonly studentParentSvc: StudentParentService,
    private readonly cache: CacheService,
  ) {}

  /**
   * 查询家长关联的所有孩子（优先 StudentParent 关联表，回退 Student.parentId）。
   * 支持跨班跨校多娃。
   */
  async findKids(parentId: string): Promise<Student[]> {
    if (!parentId) return []
    const bindings = await this.studentParentSvc.listByParent(parentId)
    if (bindings.length) {
      const studentIds = bindings.map(b => b.studentId)
      return this.studentRepo.find({ where: { id: In(studentIds) } })
    }
    return this.studentRepo.find({ where: { parentId } })
  }

  /** 按学号查询学生用于家长登录 */
  async findStudentByNoForLogin(studentNo: string) {
    return findStudentByNoForLogin(this.studentRepo, studentNo)
  }

  /** 孩子所在班级的通知 */
  async getNotices(classId: string) {
    if (!classId) return []
    const notices = await this.noticeRepo.find({
      where: { classId },
      order: { createdAt: 'DESC' },
      take: 30,
    })
    return notices.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      classId: n.classId,
      pinned: n.pinned,
      ended: n.ended,
      createdAt: n.createdAt,
    }))
  }

  /** 考试成绩明细 + 排名 + 分布 */
  async getExams(payload: any) {
    const { classId, studentId } = payload
    if (!classId || !studentId) {
      return { exams: [] }
    }
    const stu = await this.studentRepo.findOne({ where: { id: studentId, classId } })
    if (!stu) {
      return { exams: [] }
    }
    const cacheKey = `parent-exams:${classId}`
    const cached = this.cache.get<any>(cacheKey)
    if (cached) {
      return this.filterExamsForStudent(cached, studentId)
    }
    const [exams, grades, students] = await Promise.all([
      this.examRepo.find({ where: { classId }, order: { date: 'ASC' }, take: 500 }),
      this.gradeRepo.find({ where: { classId }, take: 1000 }),
      this.studentRepo.find({ where: { classId }, take: 500 }),
    ])
    const result = this.computeExams(exams, grades, students)
    this.cache.set(cacheKey, result, this.EXAM_CACHE_TTL)
    return this.filterExamsForStudent(result, studentId)
  }

  /** 孩子所在班级的作业 */
  async getHomework(payload: any) {
    const { classId, studentId } = payload
    if (!classId || !studentId) return []
    const stu = await this.studentRepo.findOne({ where: { id: studentId, classId } })
    if (!stu) return []
    const list = await this.homeworkRepo.find({
      where: { classId },
      order: { createdAt: 'DESC' },
      take: 30,
    })
    return list.map((h) => ({
      id: h.id,
      subject: h.subject,
      title: h.title,
      content: h.content,
      startDate: h.startDate,
      deadline: h.deadline,
      status: h.status,
    }))
  }

  /** 家长视角的孩子打卡/考勤汇总 */
  async getAttendance(payload: any) {
    const { studentId } = payload
    const empty = { total: 0, summary: { reading: 0, sport: 0, behavior: 0, homework: 0 }, recent: [], byMonth: [] }
    if (!studentId) return empty
    const list = await this.checkinRepo.find({
      where: { studentId },
      order: { date: 'DESC', createdAt: 'DESC' },
      take: 300,
    })
    if (!list.length) return empty
    const summary = { reading: 0, sport: 0, behavior: 0, homework: 0 }
    for (const c of list) {
      if (Object.prototype.hasOwnProperty.call(summary, c.type)) {
        summary[c.type] += c.count || 1
      }
    }
    const total = list.reduce((s, c) => s + (c.count || 1), 0)
    const recent = list.slice(0, 10).map((c) => ({
      id: c.id,
      type: c.type,
      date: c.date,
      count: c.count,
      note: c.note,
    }))
    const monthMap = new Map<string, number>()
    for (const c of list) {
      const m = (c.date || '').slice(0, 7)
      if (!m) continue
      monthMap.set(m, (monthMap.get(m) || 0) + (c.count || 1))
    }
    const byMonth = Array.from(monthMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-6)
      .map(([month, count]) => ({ month, count }))
    return { total, summary, recent, byMonth }
  }

  /** 孩子行为表现记录 */
  async getBehavior(payload: any) {
    const { studentId } = payload
    const empty = { total: 0, summary: { praise: 0, violation: 0, other: 0 }, recent: [], byMonth: [] }
    if (!studentId) return empty
    const list = await this.behaviorRepo.find({
      where: { studentId },
      order: { date: 'DESC', createdAt: 'DESC' },
      take: 200,
    })
    if (!list.length) return empty
    const summary = { praise: 0, violation: 0, other: 0 }
    const catOf = (b: string) =>
      /表扬|奖励|优秀|进步|嘉奖|⭐/.test(b || '') ? 'praise'
        : /违纪|批评|警告|处分|迟到|早退/.test(b || '') ? 'violation' : 'other'
    for (const r of list) summary[catOf(r.behavior)] += 1
    const recent = list.slice(0, 10).map((r) => ({
      id: r.id,
      date: r.date,
      behavior: r.behavior,
      note: r.note,
      category: catOf(r.behavior),
    }))
    const monthMap = new Map<string, number>()
    for (const r of list) {
      const m = (r.date || '').slice(0, 7)
      if (!m) continue
      monthMap.set(m, (monthMap.get(m) || 0) + 1)
    }
    const byMonth = Array.from(monthMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-6)
      .map(([month, count]) => ({ month, count }))
    return { total: list.length, summary, recent, byMonth }
  }

  /**
   * 孩子课表 + 本周值日（按 classId + 孩子姓名匹配 persons）。
   * dayOfWeek 约定：1=周一 … 7=周日。
   */
  async getSchedule(payload: any) {
    const { classId, studentName } = payload
    const empty = { week: [], todayDow: 0, upcomingDuty: [] }
    if (!classId) return empty
    const todayDow = ((new Date().getDay() + 6) % 7) + 1
    const items = await this.scheduleRepo.find({
      where: { classId },
      order: { dayOfWeek: 'ASC', period: 'ASC' },
      take: 200,
    })
    const weekMap = new Map<number, any[]>()
    for (const it of items) {
      const entry = { period: it.period, section: it.section, subject: it.subject, teacher: it.teacher, note: it.note }
      if (!weekMap.has(it.dayOfWeek)) weekMap.set(it.dayOfWeek, [])
      weekMap.get(it.dayOfWeek)!.push(entry)
    }
    const week = Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([dayOfWeek, its]) => ({ dayOfWeek, items: its }))
    const rosters = await this.dutyRepo.find({ where: { classId }, take: 100 })
    const todayStr = this.localToday()
    const upcomingDuty: any[] = []
    for (const ros of rosters) {
      for (const a of ros.assignments || []) {
        if (!a.date || a.date < todayStr) continue
        if (studentName && Array.isArray(a.persons) && a.persons.includes(studentName)) {
          upcomingDuty.push({ date: a.date, name: ros.name, type: ros.type })
        }
      }
    }
    upcomingDuty.sort((a, b) => (a.date < b.date ? -1 : 1))
    return { week, todayDow, upcomingDuty: upcomingDuty.slice(0, 10) }
  }

  /** 家校沟通记录 */
  async getCommunications(payload: any) {
    const { studentId } = payload
    const empty = { total: 0, recent: [] }
    if (!studentId) return empty
    const list = await this.pcRepo.find({
      where: { studentId },
      order: { date: 'DESC', createdAt: 'DESC' },
      take: 50,
    })
    const recent = list.map((c) => ({
      id: c.id,
      date: c.date,
      method: c.method,
      content: c.content,
      followUp: c.followUp,
      parentName: c.parentName,
      relation: c.relation,
    }))
    return { total: list.length, recent }
  }

  /** 孩子所在班级的科任老师信息 */
  async getTeachers(payload: any) {
    const { classId } = payload
    if (!classId) return []
    const members = await this.classMemberRepo.find({
      where: { classId },
      order: { role: 'DESC', createdAt: 'ASC' },
      take: 100,
    })
    if (!members.length) return []
    const teacherIds = [...new Set(members.map(m => m.teacherId))]
    const teachers = await this.usersRepo.find({ where: { id: In(teacherIds) } })
    const teacherMap = new Map(teachers.map(t => [t.id, t]))
    return members.map(m => {
      const t = teacherMap.get(m.teacherId)
      return {
        teacherId: m.teacherId,
        name: t?.name || '老师',
        role: m.role,
        roleLabel: m.role === 'head' ? '班主任' : '科任老师',
        subjects: m.subjects || [],
        subject: t?.subject || '',
        phone: maskPhone(t?.phone),
        avatar: t?.avatar || '',
      }
    })
  }

  /** 多娃考试对比 */
  async getKidsComparison(payload: any) {
    if (!payload.parentId) throw new ForbiddenException('无家长身份')
    const kids = await this.findKids(payload.parentId)
    if (kids.length < 2) return { kids: kids.map(k => ({ studentId: k.id, studentName: k.name, classId: k.classId })), exams: [] }

    const examPromises = kids.map(async (kid) => {
      const kidPayload = { classId: kid.classId, studentId: kid.id }
      const result = await this.getExams(kidPayload)
      return { studentId: kid.id, classId: kid.classId, exams: result.exams || [] }
    })
    const results = await Promise.all(examPromises)

    // 智能匹配：按考试名称+日期范围（7天内）组合匹配
    // 不同班级的同名考试如果日期接近，视为同一次考试
    const examGroups: any[] = []
    const allExams: Array<{ studentId: string; classId: string; exam: any }> = []
    for (const r of results) {
      for (const e of (r.exams || [])) {
        allExams.push({ studentId: r.studentId, classId: r.classId, exam: e })
      }
    }

    // 按日期排序
    allExams.sort((a, b) => (a.exam.date || '').localeCompare(b.exam.date || ''))

    // 分组匹配：同名且日期相差7天内视为同一次考试
    const used = new Set<number>()
    for (let i = 0; i < allExams.length; i++) {
      if (used.has(i)) continue
      const current = allExams[i]
      const group: any = {
        examName: current.exam.examName,
        date: current.exam.date,
        term: current.exam.term,
        rows: {},
        classDates: {},  // 记录每个孩子的考试日期
      }
      group.rows[current.studentId] = current.exam
      group.classDates[current.studentId] = current.exam.date
      used.add(i)

      // 查找匹配的其他考试
      for (let j = i + 1; j < allExams.length; j++) {
        if (used.has(j)) continue
        const other = allExams[j]
        if (other.exam.examName !== current.exam.examName) continue
        // 检查日期是否在7天内
        const dateDiff = Math.abs(this.dateDiffDays(current.exam.date, other.exam.date))
        if (dateDiff <= 7) {
          group.rows[other.studentId] = other.exam
          group.classDates[other.studentId] = other.exam.date
          used.add(j)
        }
      }
      examGroups.push(group)
    }

    return {
      kids: kids.map(k => ({ studentId: k.id, studentName: k.name, classId: k.classId })),
      exams: examGroups.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    }
  }

  /** 计算两个日期字符串的天数差 */
  private dateDiffDays(date1: string, date2: string): number {
    if (!date1 || !date2) return 999
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24))
  }


  /**
   * 计算同分同名次排名映射（标准竞赛排名法：1224型）
   * @param arr 已按分数降序排列的数组，每项包含 studentId 和 score
   * @returns Map<studentId, rank>
   */
  private computeRankMap(arr: Array<{ studentId: string; score: number }>): Map<string, number> {
    const rankMap = new Map<string, number>()
    let prevScore: number | null = null
    let prevRank = 0
    arr.forEach((item, idx) => {
      let rank: number
      if (prevScore === null || item.score !== prevScore) {
        rank = idx + 1
        prevScore = item.score
        prevRank = rank
      } else {
        rank = prevRank
      }
      rankMap.set(item.studentId, rank)
    })
    return rankMap
  }

  /** 本地日期字符串 YYYY-MM-DD */
  private localToday(): string {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
  }

  /** 一次计算全班所有考试的排名与分布 */
  private computeExams(exams: any[], grades: any[], students: any[]) {
    const examList = []
    for (const exam of exams) {
      const key = exam.id || exam.name
      const studentScoreMap = new Map<string, { total: number; full: number; subjects: any[] }>()
      for (const g of grades) {
        if ((g.examId || g.examName) !== key) continue
        for (const s of g.scores || []) {
          const fs = (exam.subjectFullScores && exam.subjectFullScores[g.subject]) || 100
          if (!studentScoreMap.has(s.studentId)) studentScoreMap.set(s.studentId, { total: 0, full: 0, subjects: [] })
          const entry = studentScoreMap.get(s.studentId)!
          entry.subjects.push({ subject: g.subject, score: s.score, fullScore: fs })
          if (s.score != null) { entry.total += Number(s.score); entry.full += fs }
        }
      }
      const subjectRanks = new Map<string, Array<{ studentId: string; score: number }>>()
      for (const [sid, data] of studentScoreMap) {
        for (const sub of data.subjects) {
          if (sub.score == null) continue
          if (!subjectRanks.has(sub.subject)) subjectRanks.set(sub.subject, [])
          subjectRanks.get(sub.subject)!.push({ studentId: sid, score: Number(sub.score) })
        }
      }
      for (const [, arr] of subjectRanks) arr.sort((a, b) => b.score - a.score)
      const totalRanks = Array.from(studentScoreMap.entries())
        .map(([sid, d]) => ({ studentId: sid, total: d.total }))
        .filter(x => x.total > 0)
        .sort((a, b) => b.total - a.total)
      // 预计算总分排名（同分同名次）
      const totalRankMap = this.computeRankMap(totalRanks.map(r => ({ studentId: r.studentId, score: r.total })))
      const distribution = buildDistribution([...totalRanks.map(r => r.total)], '', null)

      // 计算班级整体统计：均分、及格率、优秀率、各科均分
      const allTotals = totalRanks.map(r => r.total).filter(t => t > 0)
      const classAvg = allTotals.length ? Math.round((allTotals.reduce((a, b) => a + b, 0) / allTotals.length) * 10) / 10 : 0
      const classFullAvg = exam.subjects.reduce((sum, subj) => {
        const fs = (exam.subjectFullScores && exam.subjectFullScores[subj]) || 100
        return sum + fs
      }, 0) || 100 * (exam.subjects?.length || 1)
      const passCount = allTotals.filter(t => t >= classFullAvg * 0.6).length
      const excellentCount = allTotals.filter(t => t >= classFullAvg * 0.85).length
      const classPassRate = allTotals.length ? Math.round((passCount / allTotals.length) * 1000) / 10 : 0
      const classExcellentRate = allTotals.length ? Math.round((excellentCount / allTotals.length) * 1000) / 10 : 0

      // 各科班级均分
      const subjectClassAvgs = new Map<string, { total: number; count: number }>()
      for (const [, data] of studentScoreMap) {
        for (const sub of data.subjects) {
          if (sub.score == null) continue
          if (!subjectClassAvgs.has(sub.subject)) subjectClassAvgs.set(sub.subject, { total: 0, count: 0 })
          const entry = subjectClassAvgs.get(sub.subject)!
          entry.total += Number(sub.score)
          entry.count += 1
        }
      }
      const classSubjectStats = new Map<string, { avg: number; passRate: number; excellentRate: number; count: number }>()
      for (const [subj, agg] of subjectClassAvgs) {
        const avg = agg.count ? Math.round((agg.total / agg.count) * 10) / 10 : 0
        // 该科及格/优秀率需重新统计
        let passN = 0, excN = 0
        const fs = (exam.subjectFullScores && exam.subjectFullScores[subj]) || 100
        for (const [, data] of studentScoreMap) {
          const sub = data.subjects.find((s: any) => s.subject === subj && s.score != null)
          if (!sub) continue
          if (Number(sub.score) >= fs * 0.6) passN++
          if (Number(sub.score) >= fs * 0.85) excN++
        }
        classSubjectStats.set(subj, {
          avg,
          passRate: agg.count ? Math.round((passN / agg.count) * 1000) / 10 : 0,
          excellentRate: agg.count ? Math.round((excN / agg.count) * 1000) / 10 : 0,
          count: agg.count,
        })
      }

      for (const [sid, data] of studentScoreMap) {
        const totalRank = totalRankMap.get(sid) || 0
        for (const sub of data.subjects) {
          const arr = subjectRanks.get(sub.subject) || []
          if (sub.score != null) {
            const subRankMap = this.computeRankMap(arr)
            sub.classRank = subRankMap.get(sid) ?? null
          } else {
            sub.classRank = null
          }
        }
        ;(data as any).classRank = totalRank > 0 ? totalRank : null
        ;(data as any).studentId = sid
      }
      examList.push({
        examId: exam.id,
        examName: exam.name,
        date: exam.date,
        term: exam.term,
        _studentScoreMap: studentScoreMap,
        _subjectRanks: subjectRanks,
        _totalRanks: totalRanks,
        distribution,
        analysisNote: exam.analysisNote || null,
        classStats: {
          classAvg,
          classFullAvg,
          classPassRate,
          classExcellentRate,
          classStudentCount: allTotals.length,
          subjectAvgs: Object.fromEntries(classSubjectStats),
        },
      })
    }
    return { exams: examList }
  }

  /** 从全班考试计算结果中过滤出当前学生的视图 */
  private filterExamsForStudent(fullData: any, studentId: string) {
    if (!fullData || !fullData.exams) return { exams: [] }
    return {
      exams: fullData.exams.map((exam: any) => {
        const myData = exam._studentScoreMap?.get(studentId)
        const subjects = myData ? myData.subjects.map((s: any) => {
          const classStat = exam.classStats?.subjectAvgs?.[s.subject]
          return {
            ...s,
            classAvg: classStat?.avg ?? null,
            classPassRate: classStat?.passRate ?? null,
            classExcellentRate: classStat?.excellentRate ?? null,
          }
        }) : []
        const totalScore = myData ? myData.total : null
        const totalFullScore = myData ? myData.full : null
        // 个人百分位排名（基于总分）
        const totalRanks = exam._totalRanks || []
        const myRank = totalRanks.findIndex((r: any) => r.studentId === studentId)
        const percentile = totalRanks.length && myRank >= 0
          ? Math.round(((totalRanks.length - myRank - 1) / totalRanks.length) * 1000) / 10
          : null
        const cs = exam.classStats || {}
        return {
          examId: exam.examId,
          examName: exam.examName,
          date: exam.date,
          term: exam.term,
          subjects,
          totalScore,
          totalFullScore,
          classRank: myData ? (myData as any).classRank : null,
          percentile,
          gradeRank: null,
          distribution: exam.distribution,
          analysisNote: exam.analysisNote,
          classStats: {
            classAvg: cs.classAvg ?? null,
            classFullAvg: cs.classFullAvg ?? null,
            classPassRate: cs.classPassRate ?? null,
            classExcellentRate: cs.classExcellentRate ?? null,
            classStudentCount: cs.classStudentCount ?? 0,
          },
        }
      }),
    }
  }
}

/** P8：教师手机号脱敏 */
function maskPhone(phone?: string): string {
  if (!phone) return phone || ''
  const p = String(phone).trim()
  if (p.length < 7) return p
  return p.slice(0, 3) + '****' + p.slice(-4)
}

/** 构建总分分布柱状图数据（10分一段） */
function buildDistribution(allScores: number[], studentId: string, studentTotal: number | null) {
  if (!allScores.length) return []
  const max = Math.max(...allScores)
  const bucketSize = 10
  const buckets: Record<string, number> = {}
  for (const s of allScores) {
    const lower = Math.floor(s / bucketSize) * bucketSize
    const key = `${lower}-${lower + bucketSize - 1}`
    buckets[key] = (buckets[key] || 0) + 1
  }
  const maxCount = Math.max(...Object.values(buckets), 1)
  return Object.entries(buckets).sort(([a], [b]) => {
    const aLo = parseInt(a.split('-')[0])
    const bLo = parseInt(b.split('-')[0])
    return aLo - bLo
  }).map(([label, count]) => ({
    label, count, pct: Math.round(count / maxCount * 100),
    isStudent: studentTotal != null && (
      parseInt(label.split('-')[0]) <= studentTotal && studentTotal <= parseInt(label.split('-')[1])
    ),
  }))
}
