import { Injectable, BadRequestException } from '@nestjs/common'
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

  /** 考试成绩明细 + 排名 + 分布 */
  async getExams(payload: any) {
    const { classId, studentId } = payload
    if (!classId || !studentId) return { exams: [] }
    const [exams, grades, students] = await Promise.all([
      this.examRepo.find({ where: { classId }, order: { date: 'ASC' } }),
      this.gradeRepo.find({ where: { classId } }),
      this.studentRepo.find({ where: { classId } }),
    ])

    const examList = []
    for (const exam of exams) {
      const key = exam.id || exam.name
      // 收集所有在该考试有成绩的学生ID
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
      
      // 构建各科排名字典
      const subjectRanks = new Map<string, Array<{ studentId: string; score: number }>>()
      for (const [sid, data] of studentScoreMap) {
        for (const sub of data.subjects) {
          if (sub.score == null) continue
          if (!subjectRanks.has(sub.subject)) subjectRanks.set(sub.subject, [])
          subjectRanks.get(sub.subject)!.push({ studentId: sid, score: Number(sub.score) })
        }
      }
      for (const [subj, arr] of subjectRanks) arr.sort((a, b) => b.score - a.score)
      
      // 该生数据
      const myData = studentScoreMap.get(studentId)
      const subjects = myData ? myData.subjects : []
      const totalScore = myData ? myData.total : null
      const totalFullScore = myData ? myData.full : null
      
      // 每科排名
      subjects.forEach((sub) => {
        const arr = subjectRanks.get(sub.subject) || []
        sub.classRank = sub.score != null ? arr.findIndex(r => r.studentId === studentId) + 1 : null
      })
      
      // 总分排名
      const totalRanks = Array.from(studentScoreMap.entries())
        .map(([sid, d]) => ({ studentId: sid, total: d.total }))
        .filter(x => x.total > 0)
        .sort((a, b) => b.total - a.total)
      const classRank = totalRanks.findIndex(r => r.studentId === studentId) + 1
      
      // 分布柱状图数据（10分一段，基于总分实际值）
      const distribution = buildDistribution([
        ...totalRanks.map(r => r.total),
      ], studentId, totalScore)
      
      examList.push({
        examId: exam.id,
        examName: exam.name,
        date: exam.date,
        term: exam.term,
        subjects,
        totalScore,
        totalFullScore,
        classRank: classRank > 0 ? classRank : null,
        gradeRank: null,  // 同年级排名暂不支持
        distribution,
        analysisNote: exam.analysisNote || null,
      })
    }
    
    return { exams: examList }
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
