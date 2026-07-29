import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { Notice, Homework } from '../school/school.entity'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { Checkin } from '../checkin/checkin.module'
import { ScheduleItem } from '../school/school.entity'
import { BehaviorRecord } from '../growth/growth.entity'
import { DutyRoster } from '../duty-roster/duty.entity'
import { ImService } from '../im/im.module'
import { parentImUserId } from '../im/parent-im.util'
import { WechatService } from '../auth/wechat.service'
import { hashPassword, verifyAndUpgrade } from '../common/utils/password.util'

/**
 * 家长端：凭学生学号登录 → 查看孩子考试成绩+趋势分析 + IM 与老师对话。
 * 家长 IM 账号由（studentId + parentName）规范派生，与教师花名册一致。
 */
@Injectable()
export class ParentAuthService {
  constructor(
    @InjectRepository(ParentContact) private readonly pcRepo: Repository<ParentContact>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Notice) private readonly noticeRepo: Repository<Notice>,
    @InjectRepository(Homework) private readonly homeworkRepo: Repository<Homework>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
    @InjectRepository(Checkin) private readonly checkinRepo: Repository<Checkin>,
    @InjectRepository(ScheduleItem) private readonly scheduleRepo: Repository<ScheduleItem>,
    @InjectRepository(BehaviorRecord) private readonly behaviorRepo: Repository<BehaviorRecord>,
    @InjectRepository(DutyRoster) private readonly dutyRepo: Repository<DutyRoster>,
    private readonly jwt: JwtService,
    private readonly im: ImService,
    private readonly config: ConfigService,
    private readonly wechat: WechatService,
  ) {}

  /** 学号 + 密码登录 */
  async login(studentNo: string, password: string) {
    if (!studentNo || !/^\d+$/.test(studentNo.trim()))
      throw new BadRequestException('请输入正确的学号')
    if (!password) throw new BadRequestException('请输入密码')
    const no = studentNo.trim()
    const stu = await this.studentRepo.findOne({ where: { studentNo: no } })
    if (!stu) throw new BadRequestException('未找到该学号对应的学生，请检查学号是否正确')
    if (!stu.parentLoginEnabled) throw new BadRequestException('该学生家长登录尚未被老师授权，请联系老师开启')

    // 密码校验：必须用老师开启家长登录时生成的随机初始密码（bcrypt 哈希存储）。
    // 不再支持默认弱密码 '123456'；未初始化密码的学生直接拒绝登录。
    const hash = stu.parentPasswordHash
    let passwordOk = false
    if (hash) {
      const { valid, newHash } = verifyAndUpgrade(password, hash)
      passwordOk = valid
      // 旧 sha256 校验通过后自动升级为 bcrypt
      if (valid && newHash) {
        stu.parentPasswordHash = newHash
        await this.studentRepo.save(stu)
      }
    }
    if (!passwordOk) {
      if (!hash)
        throw new BadRequestException('家长密码尚未初始化，请联系老师重新开启家长登录以设置密码')
      throw new UnauthorizedException('密码错误')
    }

    const parentName = stu.parentName || '家长'
    const imUserId = parentImUserId({ studentId: stu.id, relation: '家长', parentName })
    const token = this.jwt.sign({
      sub: imUserId,
      type: 'parent',
      studentId: stu.id,
      studentName: stu.name,
      classId: stu.classId,
      studentNo: no,
    })
    return {
      token,
      parent: { imUserId, studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo: no },
    }
  }

  /** 家长修改自己的登录密码（需已登录） */
  async changePassword(payload: any, oldPassword: string, newPassword: string) {
    if (!oldPassword) throw new BadRequestException('请输入原密码')
    if (!newPassword || newPassword.length < 8)
      throw new BadRequestException('新密码至少 8 位')
    const stu = await this.studentRepo.findOne({ where: { id: payload.studentId } })
    if (!stu) throw new BadRequestException('学生不存在')

    // 校验原密码：与 login 一致，必须已设置哈希
    const hash = stu.parentPasswordHash
    let oldOk = false
    if (hash) {
      oldOk = verifyAndUpgrade(oldPassword, hash).valid
    }
    if (!oldOk) {
      if (!hash)
        throw new BadRequestException('家长密码尚未初始化，请联系老师重新开启家长登录以设置密码')
      throw new UnauthorizedException('原密码错误')
    }

    stu.parentPasswordHash = hashPassword(newPassword)
    await this.studentRepo.save(stu)
    return { ok: true }
  }

  /** 当前家长信息 + 孩子 */
  async getMe(payload: any) {
    let className = ''
    let nickName = ''
    try {
      const cls = await this.classRepo.findOne({ where: { id: payload.classId } })
      if (cls) className = cls.name
      const stu = await this.studentRepo.findOne({ where: { id: payload.studentId } })
      if (stu && stu.parentNickName) nickName = stu.parentNickName
    } catch {}
    return {
      imUserId: payload.sub,
      studentId: payload.studentId,
      studentName: payload.studentName,
      classId: payload.classId,
      className,
      studentNo: payload.studentNo,
      nickName,
      kids: [
        { studentId: payload.studentId, studentName: payload.studentName, studentNo: payload.studentNo, classId: payload.classId, className, nickName },
      ],
    }
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

  /** 绑定微信 openid 到学生记录 */
  async bindWechat(code: string, payload: any, nickName: string) {
    if (!code) throw new BadRequestException('缺少 code')
    const { openid } = await this.wechat.code2Session(code)
    const stu = await this.studentRepo.findOne({ where: { id: payload.studentId } })
    if (!stu) throw new BadRequestException('学生不存在')
    stu.parentOpenId = openid
    if (nickName) stu.parentNickName = nickName
    await this.studentRepo.save(stu)
    return { ok: true, nickName }
  }

  /** 考试成绩明细 + 排名 + 分布（带缓存，避免全量重复计算） */
  private _examCache = new Map<string, { ts: number; data: any }>()
  private readonly EXAM_CACHE_TTL = 5 * 60 * 1000  // 5 分钟缓存
  private readonly MAX_RECENT_EXAMS = 10  // 最多返回最近 10 次考试

  async getExams(payload: any) {
    const { classId, studentId } = payload
    if (!classId || !studentId) {
      return { exams: [] }
    }
    // 校验 studentId 是否属于当前家长绑定的孩子
    const stu = await this.studentRepo.findOne({ where: { id: studentId, classId } })
    if (!stu) {
      return { exams: [] }
    }
    // 缓存命中（同班所有家长共享，减少全量计算频率）
    const cacheKey = `exams:${classId}`
    const cached = this._examCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < this.EXAM_CACHE_TTL) {
      return this.filterExamsForStudent(cached.data, studentId)
    }
    const [exams, grades, students] = await Promise.all([
      this.examRepo.find({ where: { classId }, order: { date: 'ASC' }, take: 500 }),
      this.gradeRepo.find({ where: { classId }, take: 1000 }),
      this.studentRepo.find({ where: { classId }, take: 500 }),
    ])
    const result = this.computeExams(exams, grades, students)
    this._examCache.set(cacheKey, { ts: Date.now(), data: result })
    return this.filterExamsForStudent(result, studentId)
  }

  /** 孩子所在班级的作业 */
  async getHomework(payload: any) {
    const { classId, studentId } = payload
    if (!classId || !studentId) return []
    // 校验 studentId 是否属于当前家长绑定的孩子
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

  /** 家长视角的孩子打卡/考勤汇总（严格按 JWT 的 studentId 隔离，禁止接受客户端传入的学生ID） */
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
    // 近 6 个月按月聚合（date 形如 2026-07-20）
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

  /** 本地日期字符串 YYYY-MM-DD（避免 toISOString 的 UTC 偏移） */
  private localToday(): string {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
  }

  /**
   * 孩子行为表现记录（严格按 JWT 的 studentId 隔离）。
   * 注：AwardRecord 无 studentId 关联，暴露班级级奖惩会泄露其他孩子数据，故按 D13 红线排除。
   */
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
   * 孩子课表（按 classId 隔离）+ 本周值日（按 classId + 孩子姓名匹配 persons）。
   * dayOfWeek 约定：1=周一 … 7=周日。
   */
  async getSchedule(payload: any) {
    const { classId, studentName } = payload
    const empty = { week: [], todayDow: 0, upcomingDuty: [] }
    if (!classId) return empty
    const todayDow = ((new Date().getDay() + 6) % 7) + 1 // JS Sun=0 … Sat=6 → Mon=1 … Sun=7
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
    // 值日：本班所有值日表，仅保留含当前孩子姓名的未来排班
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

  /** 家校沟通记录（严格按 JWT 的 studentId 隔离，仅看自己孩子的沟通） */
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

  /** 家长订阅微信通知：用前端 wx.login code 换取 openId，存入学生表 */
  async subscribe(studentNo: string, code: string) {
    if (!code) return { ok: false, msg: '缺少 code' }
    const stu = await this.studentRepo.findOne({ where: { studentNo } })
    if (!stu) throw new BadRequestException('学生不存在')
    const appId = this.config.get('WX_APPID')
    const secret = this.config.get('WX_APP_SECRET')
    if (!appId || !secret) return { ok: false, msg: '未配置微信 AppId/AppSecret，演示模式不支持订阅' }
    try {
      const resp = await fetch(
        `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`,
      )
      const data = (await resp.json()) as any
      const openId = (data && data.openid) || ''
      if (openId) {
        stu.parentOpenId = openId
        await this.studentRepo.save(stu)
      }
      return { ok: !!openId, openId }
    } catch (e) {
      return { ok: false, msg: '订阅请求失败' }
    }
  }

  /** 签发家长 IM UserSig */
  getImUserSig(payload: any) {
    return this.im.getUserSig(payload.sub)
  }

  /** 一次计算全班所有考试的排名与分布（可被同班多位家长缓存复用） */
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
      const distribution = buildDistribution([...totalRanks.map(r => r.total)], '', null)
      // 每科排名 + 总分排名（全班）
      for (const [sid, data] of studentScoreMap) {
        const totalRank = totalRanks.findIndex(r => r.studentId === sid) + 1
        for (const sub of data.subjects) {
          const arr = subjectRanks.get(sub.subject) || []
          sub.classRank = sub.score != null ? arr.findIndex(r => r.studentId === sid) + 1 : null
        }
        // 挂载全班排名信息供后续单生过滤
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
      })
    }
    return { exams: examList }
  }

  /** 从全班考试计算结果中过滤出当前学生的视图（传输量最小化） */
  private filterExamsForStudent(fullData: any, studentId: string) {
    if (!fullData || !fullData.exams) return { exams: [] }
    return {
      exams: fullData.exams.map((exam: any) => {
        const myData = exam._studentScoreMap?.get(studentId)
        const subjects = myData ? myData.subjects : []
        return {
          examId: exam.examId,
          examName: exam.examName,
          date: exam.date,
          term: exam.term,
          subjects,
          totalScore: myData ? myData.total : null,
          totalFullScore: myData ? myData.full : null,
          classRank: myData ? (myData as any).classRank : null,
          gradeRank: null,
          distribution: exam.distribution,
          analysisNote: exam.analysisNote,
        }
      }),
    }
  }
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
