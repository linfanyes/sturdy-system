import { Injectable, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { Student } from '../students/student.entity'
import { Notice, Homework } from '../school/school.entity'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { ImService } from '../im/im.module'
import { parentImUserId } from '../im/parent-im.util'

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
    private readonly jwt: JwtService,
    private readonly im: ImService,
    private readonly config: ConfigService,
  ) {}

  /** 学号登录 */
  async login(studentNo: string) {
    if (!studentNo || !/^\d+$/.test(studentNo.trim()))
      throw new BadRequestException('请输入正确的学号')
    const no = studentNo.trim()
    const stu = await this.studentRepo.findOne({ where: { studentNo: no } })
    if (!stu) throw new BadRequestException('未找到该学号对应的学生，请检查学号是否正确')
    if (!stu.parentLoginEnabled) throw new BadRequestException('该学生家长登录尚未被老师授权，请联系老师开启')
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

  /** 当前家长信息 + 孩子 */
  getMe(payload: any) {
    return {
      imUserId: payload.sub,
      studentId: payload.studentId,
      studentName: payload.studentName,
      classId: payload.classId,
      studentNo: payload.studentNo,
      kids: [
        { studentId: payload.studentId, studentName: payload.studentName, classId: payload.classId },
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

  /** 考试成绩明细 + 趋势分析 */
  async getExams(payload: any) {
    const { classId, studentId } = payload
    if (!classId || !studentId) return { exams: [], analysis: null }
    const [exams, grades] = await Promise.all([
      this.examRepo.find({ where: { classId }, order: { date: 'ASC' } }),
      this.gradeRepo.find({ where: { classId } }),
    ])
    const scoreMap: Record<string, Record<string, { score: number | null; fullScore: number }>> = {}
    for (const g of grades) {
      const entry = g.scores.find((s) => s.studentId === studentId)
      if (!entry) continue
      const examKey = g.examId || g.examName
      if (!scoreMap[examKey]) scoreMap[examKey] = {}
      scoreMap[examKey][g.subject] = {
        score: entry.score,
        fullScore: 100, // default, can be overridden by exam.subjectFullScores
      }
    }
    const examList: any[] = []
    let totalAccum = 0
    let countAccum = 0
    const subjectTotals: Record<string, { total: number; count: number }> = {}

    for (const exam of exams) {
      const subjects: any[] = []
      let examTotal = 0
      let examFull = 0
      const key = exam.id || exam.name
      const map = scoreMap[key] || {}
      for (const subj of exam.subjects || []) {
        const fs = (exam.subjectFullScores && exam.subjectFullScores[subj]) || 100
        const entry = map[subj]
        const score = entry ? entry.score : null
        subjects.push({ subject: subj, score, fullScore: fs })
        if (score !== null) {
          examTotal += score
          examFull += fs
          if (!subjectTotals[subj]) subjectTotals[subj] = { total: 0, count: 0 }
          subjectTotals[subj].total += score
          subjectTotals[subj].count++
        }
      }
      examList.push({
        examId: exam.id,
        examName: exam.name,
        date: exam.date,
        term: exam.term,
        subjects,
        totalScore: examFull ? (examTotal / examFull * 100).toFixed(1) : null,
      })
      if (examFull) { totalAccum += examTotal; countAccum += examFull }
    }

    // 趋势：最近考试总分 vs 上次
    let trend: any = null
    if (examList.length >= 2) {
      const last = examList[examList.length - 1]
      const prev = examList[examList.length - 2]
      if (last.totalScore !== null && prev.totalScore !== null) {
        const diff = (parseFloat(last.totalScore) - parseFloat(prev.totalScore)).toFixed(1)
        trend = { diff, direction: parseFloat(diff) >= 0 ? 'up' : 'down' }
      }
    }

    // 优势/薄弱学科
    let bestSubject = ''
    let worstSubject = ''
    let bestAvg = -1
    let worstAvg = Infinity
    for (const [s, t] of Object.entries(subjectTotals)) {
      const avg = t.total / t.count
      if (avg > bestAvg) { bestAvg = avg; bestSubject = s }
      if (avg < worstAvg) { worstAvg = avg; worstSubject = s }
    }

    const analysis = {
      overallAverage: countAccum ? (totalAccum / countAccum * 100).toFixed(1) : null,
      bestSubject: bestSubject || '',
      bestAvg: bestAvg > 0 ? bestAvg.toFixed(1) : '',
      worstSubject: worstSubject || '',
      worstAvg: worstAvg < Infinity ? worstAvg.toFixed(1) : '',
      trend,
      examCount: examList.length,
    }

    return { exams: examList, analysis }
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
        `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`,
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
}
