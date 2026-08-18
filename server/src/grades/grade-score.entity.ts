import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * P1-1修复：成绩分数明细表（Grade.scores JSON 拆分）。
 *
 * 原 Grade.scores 以 simple-json 存储全班成绩 [{studentId, score}]，
 * 存在以下问题：
 * 1. 班级人数多时单条记录体积大
 * 2. JSON 字段无法直接对 studentId 建索引
 * 3. 单学生成绩查询需拉取整班成绩
 *
 * 新表 grade_scores 每行一个学生的单科成绩，便于：
 * - 按 studentId 快速查询学生历史成绩
 * - 单学生成绩趋势分析
 * - 避免大 JSON 字段
 *
 * Grade.scores JSON 字段保留为冗余快照（兼容现有逻辑），
 * 写入时事务双写，读取单学生成绩时走本表。
 */
@Index('idx_gs_grade_student', ['gradeId', 'studentId'], { unique: true })
@Index('idx_gs_teacher_student', ['teacherId', 'studentId'])
@Index('idx_gs_exam', ['examId'])
@Entity('grade_scores')
export class GradeScore extends BaseEntity {
  /** 关联的成绩记录 ID */
  @Column({ type: 'varchar', length: 64 })
  gradeId: string

  /** 学生 ID */
  @Column({ type: 'varchar', length: 64 })
  studentId: string

  /** 分数（null 表示缺考） */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number | null

  /** 考试 ID（冗余，便于按考试查询） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  examId: string

  /** 班级 ID（冗余，便于按班级查询） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  classId: string

  /** 科目（冗余，便于按科目查询） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  subject: string
}
