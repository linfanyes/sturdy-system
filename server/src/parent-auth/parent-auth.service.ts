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
import { ImService } from '../im/im.module'
import { parentImUserId } from '../im/parent-im.util'
import { WechatService } from '../auth/wechat.service'
import { hashPassword, verifyAndUpgrade } from '../common/utils/password.util'

/** 家长默认密码（与 auth.service.ts 保持一致） */
const PARENT_DEFAULT_PASSWORD = '123456'

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

    // 密码校验：若已设置 parentPasswordHash 则用 bcrypt 校验（并透明升级旧 sha256）；
    // 否则回退到默认密码 '123456'，保持向后兼容（存量学生未设置自定义密码）。
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
    } else {
      passwordOk = password === PARENT_DEFAULT_PASSWORD
    }
    if (!passwordOk) throw new UnauthorizedException('密码错误')

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
    if (!newPassword || newPassword.length < 6)
      throw new BadRequestException('新密码至少 6 位')
    const stu = await this.studentRepo.findOne({ where: { id: payload.studentId } })
    if (!stu) throw new BadRequestException('学生不存在')

    // 校验原密码：与 login 一致的回退逻辑
    const hash = stu.parentPasswordHash
    let oldOk = false
    if (hash) {
      oldOk = verifyAndUpgrade(oldPassword, hash).valid
    } else {
      oldOk = oldPassword === PARENT_DEFAULT_PASSWORD
    }
    if (!oldOk) throw new UnauthorizedException('原密码错误')

    // 新密码不能与默认密码相同（避免弱密码）
    if (newPassword === PARENT_DEFAULT_PASSWORD)
      throw new BadRequestException('新密码不能与默认密码相同')

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
      console.warn('[getExams] 缺少 classId 或 studentId', { classId, studentId })
      return { exams: [] }
    }
    // 缓存命中（同班所有家长共享，减少全量计算频率）
    const cacheKey = `exams:${classId}`
    const cached = this._examCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < this.EXAM_CACHE_TTL) {
      // 仅过滤当前学生数据返回，减少传输
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
  async getHomework(classId: string) {
    if (!classId) return []
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
