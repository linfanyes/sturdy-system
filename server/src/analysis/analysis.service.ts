import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Exam } from '../exams/exam.entity'
import { Grade, GradeScore } from '../grades/grade.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'

/**
 * 学生成长分析服务。
 * 面向老师/校管视角，提供学生成绩趋势、班级历次考试趋势、班级学科强弱分析三类只读聚合查询。
 * 所有聚合在应用层完成，成绩 JSON 列量级可控（每班考试数有限），避免 N+1。
 */
@Injectable()
export class AnalysisService {
  constructor(
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
  ) {}

  /**
   * 学生历次考试趋势。
   * subject 可选：提供时仅返回该科成绩曲线，否则返回总分/均分/排名曲线。
   */
  async studentTrend(studentId: string, classId: string, subject?: string) {
    const student = await this.studentRepo.findOne({ where: { id: studentId } as any })
    if (!student) throw new BadRequestException('学生不存在')

    const classItem = await this.classRepo.findOne({ where: { id: classId } as any })

    const [exams, grades, studentCount] = await Promise.all([
      this.examRepo.find({ where: { classId } as any, order: { date: 'ASC' } as any }),
      this.gradeRepo.find({ where: { classId } as any }),
      this.studentRepo.count({ where: { classId } as any }),
    ])

    const gradesByExam = new Map<string, Grade[]>()
    for (const g of grades) {
      const key = g.examId || g.examName
      if (!key) continue
      if (!gradesByExam.has(key)) gradesByExam.set(key, [])
      gradesByExam.get(key)!.push(g)
    }

    // 预取学生成绩映射，避免重复扫描
    const studentScoreMap = new Map<string, Map<string, number>>() // examKey -> { subject -> score }
    for (const g of grades) {
      const key = g.examId || g.examName
      if (!key) continue
      for (const s of g.scores || []) {
        if (s.studentId !== studentId || s.score == null) continue
        if (!studentScoreMap.has(key)) studentScoreMap.set(key, new Map())
        studentScoreMap.get(key)!.set(g.subject, Number(s.score))
      }
    }

    const points: any[] = []
    for (const exam of exams) {
      const key = exam.id || exam.name
      const examGrades = gradesByExam.get(key) || []

      // 构建该班学生总分与各科成绩排名数据
      const classTotals = new Map<string, number>()
      const subjectScores = new Map<string, Array<{ studentId: string; score: number }>>()
      for (const g of examGrades) {
        for (const s of g.scores || []) {
          if (s.score == null) continue
          const sid = s.studentId
          if (!subjectScores.has(g.subject)) subjectScores.set(g.subject, [])
          subjectScores.get(g.subject)!.push({ studentId: sid, score: Number(s.score) })
          classTotals.set(sid, (classTotals.get(sid) || 0) + Number(s.score))
        }
      }
      // 排序（降序）
      for (const arr of subjectScores.values()) arr.sort((a, b) => b.score - a.score)
      const totalRanking = Array.from(classTotals.entries())
        .filter(([, t]) => t > 0)
        .sort((a, b) => b[1] - a[1])

      const myScores = studentScoreMap.get(key)
      if (!myScores || myScores.size === 0) continue

      if (subject) {
        const myScore = myScores.get(subject)
        if (myScore == null) continue
        const arr = subjectScores.get(subject) || []
        const rank = arr.findIndex(r => r.studentId === studentId) + 1
        const classAvg = this.avg(arr.map(r => r.score))
        points.push({
          examId: exam.id,
          examName: exam.name,
          date: exam.date,
          score: myScore,
          classAvg,
          rank,
        })
      } else {
        const myTotal = Array.from(myScores.values()).reduce((a, b) => a + b, 0)
        const totalRank = totalRanking.findIndex(r => r[0] === studentId) + 1
        const subjectRanks: Record<string, number> = {}
        for (const [subj, arr] of subjectScores) {
          const idx = arr.findIndex(r => r.studentId === studentId)
          if (idx >= 0) subjectRanks[subj] = idx + 1
        }
        // 班级该科均分（取本次考试所有科目的均分均值）
        const subjectAvgList: number[] = []
        for (const [subj, arr] of subjectScores) {
          subjectAvgList.push(this.avg(arr.map(r => r.score)))
        }
        const subjectAvg = this.avg(subjectAvgList)
        const classAvg = this.avg(Array.from(classTotals.values()).filter(t => t > 0))
        points.push({
          examId: exam.id,
          examName: exam.name,
          date: exam.date,
          total: myTotal,
          subjectAvg,
          classAvg,
          rank: totalRank > 0 ? totalRank : null,
          subjectRanks,
        })
      }
    }

    return {
      studentId,
      studentName: student.name,
      points,
      // 提供 subject 时仅返回该科曲线，不带 subjectRanks 等总览字段
      ...(subject ? {} : { classStudentCount: studentCount }),
    }
  }

  /**
   * 班级历次考试均分/及格率/优秀率/参加人数。
   */
  async classTrend(classId: string, subject?: string) {
    const classItem = await this.classRepo.findOne({ where: { id: classId } as any })
    if (!classItem) throw new BadRequestException('班级不存在')

    const [exams, grades] = await Promise.all([
      this.examRepo.find({ where: { classId } as any, order: { date: 'ASC' } as any }),
      this.gradeRepo.find({ where: { classId } as any }),
    ])

    const gradesByExam = new Map<string, Grade[]>()
    for (const g of grades) {
      const key = g.examId || g.examName
      if (!key) continue
      if (!gradesByExam.has(key)) gradesByExam.set(key, [])
      gradesByExam.get(key)!.push(g)
    }

    const points: any[] = []
    for (const exam of exams) {
      const key = exam.id || exam.name
      const examGrades = gradesByExam.get(key) || []
      // 按科目聚合本次考试
      const bySubject = new Map<string, number[]>()
      for (const g of examGrades) {
        const scores = (g.scores || []).filter(s => s.score != null).map(s => Number(s.score!))
        if (!bySubject.has(g.subject)) bySubject.set(g.subject, [])
        bySubject.get(g.subject)!.push(...scores)
      }
      const targetSubjects = subject ? [subject] : Array.from(bySubject.keys())
      for (const subj of targetSubjects) {
        const scores = bySubject.get(subj)
        if (!scores || scores.length === 0) continue
        const fullScore = (exam.subjectFullScores && exam.subjectFullScores[subj]) || 100
        const avg = this.avg(scores)
        const passRate = scores.filter(v => v >= fullScore * 0.6).length / scores.length
        const excellentRate = scores.filter(v => v >= fullScore * 0.85).length / scores.length
        points.push({
          examId: exam.id,
          examName: exam.name,
          date: exam.date,
          subject: subj,
          avg: Math.round(avg * 10) / 10,
          passRate: Math.round(passRate * 1000) / 1000,
          excellentRate: Math.round(excellentRate * 1000) / 1000,
          studentCount: scores.length,
        })
      }
    }

    return {
      classId,
      className: classItem.name,
      points,
    }
  }

  /**
   * 班级各科目相对强弱分析（供雷达图）。
   * 全校同年级均值用所有班级该科均分均值近似。
   */
  async subjectStrength(classId: string) {
    const classItem = await this.classRepo.findOne({ where: { id: classId } as any })
    if (!classItem) throw new BadRequestException('班级不存在')

    // 全量成绩：取本班 + 全校所有班级成绩用于对比
    const [classGrades, allGrades, classExams] = await Promise.all([
      this.gradeRepo.find({ where: { classId } as any }),
      this.gradeRepo.find({}),
      this.examRepo.find({ where: { classId } as any }),
    ])

    // 班级各科均分（取最近一次考试，若有多科则按科聚合全部考试均值）
    const classBySubject = new Map<string, number[]>()
    for (const g of classGrades) {
      const scores = (g.scores || []).filter(s => s.score != null).map(s => Number(s.score!))
      if (!scores.length) continue
      if (!classBySubject.has(g.subject)) classBySubject.set(g.subject, [])
      classBySubject.get(g.subject)!.push(...scores)
    }

    // 全校各科均分（所有班级）
    const schoolBySubject = new Map<string, number[]>()
    for (const g of allGrades) {
      const scores = (g.scores || []).filter(s => s.score != null).map(s => Number(s.score!))
      if (!scores.length) continue
      if (!schoolBySubject.has(g.subject)) schoolBySubject.set(g.subject, [])
      schoolBySubject.get(g.subject)!.push(...scores)
    }

    // 满分映射（取最近一次考试的 subjectFullScores）
    const fullScoreMap: Record<string, number> = {}
    const latestExam = classExams[classExams.length - 1]
    if (latestExam?.subjectFullScores) {
      for (const [subj, fs] of Object.entries(latestExam.subjectFullScores)) {
        fullScoreMap[subj] = fs
      }
    }

    const subjects: any[] = []
    for (const [subject, scores] of classBySubject) {
      const classAvg = this.avg(scores)
      const schoolScores = schoolBySubject.get(subject) || []
      const gradeAvg = schoolScores.length ? this.avg(schoolScores) : 0
      subjects.push({
        subject,
        classAvg: Math.round(classAvg * 10) / 10,
        gradeAvg: Math.round(gradeAvg * 10) / 10,
        delta: Math.round((classAvg - gradeAvg) * 10) / 10,
        fullScore: fullScoreMap[subject] || 100,
      })
    }

    return {
      classId,
      className: classItem.name,
      subjects,
    }
  }

  /** 简单均值，空数组返回 0 */
  private avg(arr: number[]): number {
    if (!arr.length) return 0
    return arr.reduce((a, b) => a + b, 0) / arr.length
  }
}