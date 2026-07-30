import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { Grade, GradeScore } from './grade.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'
import { ClassMemberService, ClassMembersModule } from '../class-members/class-members.module'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { xlsxFirstSheetToRows } from '../common/excel.util'
import { AiModule } from '../ai/ai.module'
import { AiService } from '../ai/ai.service'

// 成绩 AI 识别指令：约束模型输出 [{name, studentNo, score}] 结构
const GRADE_INSTRUCTION = `这是一份成绩单（图片 OCR 或文件提取后的文本），请识别其中每个学生及其分数并输出 JSON 数组。每个元素结构：
{ "name": "学生姓名", "studentNo": "学号(可选)", "score": "分数(数字或空字符串表示缺考)" }
规则：
- 只识别真实学生成绩行，跳过表头/标题/合计/平均分/排名行；
- 分数统一为数字（不含小数则整数，含小数保留一位）；
- 缺考/空值用空字符串表示；
- 只返回 JSON 数组，不要任何解释或前后缀文字。`

class GradesService extends CrudService<Grade> {
  constructor(
    @InjectRepository(Grade) repo: Repository<Grade>,
    @InjectRepository(Student) private stuRepo: Repository<Student>,
    @InjectRepository(ClassItem) private classRepo: Repository<ClassItem>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ai: AiService,
  ) {
    super(repo)
  }

  /**
   * 成绩按班级共享：同班教师可互看。
   * 安全约束：传入 classId 时必须先校验该班级归属当前教师，否则返回空，
   * 杜绝用任意 classId 越权读取其他教师班级成绩；不传 classId 时按 teacherId 过滤。
   */
  async findAll(teacherId: string, classId?: string, skip = 0, take = 500) {
    const where: any = {}
    if (classId) {
      const owned = await this.classRepo.findOne({ where: { id: classId, teacherId } } as any)
      if (!owned) return { items: [], total: 0 }
      where.classId = classId
    } else {
      where.teacherId = teacherId
    }
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' } as any,
      skip,
      take,
    })
    return { items, total }
  }

  /** 幂等导入：按 班级+考试名+科目 存在则更新分数，否则新建 */
  async mergeGrade(teacherId: string, dto: any) {
    const existing = await this.repo.findOne({
      where: {
        classId: dto.classId,
        examName: dto.examName,
        subject: dto.subject,
        teacherId,
      } as any,
    })
    if (existing) {
      existing.scores = dto.scores
      existing.date = dto.date
      existing.examId = dto.examId ?? existing.examId
      await this.repo.save(existing)
      return { created: false, id: existing.id }
    }
    const g = await this.create(teacherId, dto)
    return { created: true, id: g.id }
  }

  /** 解析成绩文件（Excel/TXT/CSV），返回原始行 */
  private async parseFile(filename: string, dataBase64: string): Promise<string[][]> {
    const ext = (filename.split('.').pop() || '').toLowerCase()
    const buf = Buffer.from(dataBase64, 'base64')
    if (ext === 'xlsx' || ext === 'xls') {
      return xlsxFirstSheetToRows(buf)
    }
    const text = buf.toString('utf-8')
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.split(/\t|,/).map((c) => c.trim()))
  }

  /** 预览：解析+匹配学生+校验分数，不落库。学生由后端按班级查询以保证权限 */
  async importPreview(
    teacherId: string,
    classId: string,
    filename: string,
    dataBase64: string,
  ) {
    const rawRows = await this.parseFile(filename, dataBase64)
    if (rawRows.length && /学号|姓名|name|student/i.test(String(rawRows[0][0]))) {
      rawRows.shift()
    }
    const students = await this.stuRepo.find({
      where: { classId } as any,
      take: 500,
    })
    const byNo = new Map(students.map((s) => [s.studentNo, s]))
    const byName = new Map(students.map((s) => [s.name, s]))

    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    rawRows.forEach((r, i) => {
      const key = String(r[0] || '').trim()
      const scoreRaw = String(r[1] ?? '').trim()
      const stu =
        (key && byNo.get(key)) || (key && byName.get(key)) || undefined
      let error = ''
      let score: number | null = null
      if (!stu) error = '找不到对应学生（按学号/姓名）'
      else if (scoreRaw === '') {
        /* 缺考视为空，允许 */
      } else if (!/^\d+(\.\d+)?$/.test(scoreRaw))
        error = '分数须为数字'
      else {
        score = Number(scoreRaw)
        if (score < 0 || score > 1000) error = '分数超出合理范围(0-1000)'
      }
      if (error) errorCount++
      else validCount++
      rows.push({
        studentId: stu ? stu.id : null,
        name: stu ? stu.name : key,
        studentNo: stu ? stu.studentNo : '',
        score,
        line: i + 1,
        valid: !error,
        error,
      })
    })
    return { rows, validCount, errorCount, total: rawRows.length }
  }

  /** 提交：事务 upsert 单条成绩记录（班级+考试+科目），任意失败整体回滚 */
  async importGrades(teacherId: string, dto: any) {
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Grade)
      const scores: GradeScore[] = (dto.rows || [])
        .filter((r: any) => r.valid && r.studentId)
        .map((r: any) => ({ studentId: r.studentId, score: r.score }))
      if (!scores.length) throw new BadRequestException('没有可导入的有效成绩')
      const existing = await repo.findOne({
        where: {
          classId: dto.classId,
          examName: dto.examName,
          subject: dto.subject,
          teacherId,
        } as any,
      })
      if (existing) {
        existing.scores = scores
        existing.date = dto.date
        existing.examId = dto.examId ?? existing.examId
        await repo.save(existing)
        return { created: false, id: existing.id, count: scores.length }
      }
      const g = new Grade()
      Object.assign(g, {
        classId: dto.classId,
        subject: dto.subject,
        examName: dto.examName,
        examId: dto.examId || null,
        date: dto.date,
        scores,
        teacherId,
      })
      const saved = await repo.save(g)
      return { created: true, id: saved.id, count: scores.length }
    })
  }

  /**
   * AI 识别成绩单（图片 OCR / Excel / CSV 文本提取后交 AI 结构化）。
   * 返回与 importPreview 一致的 { rows, validCount, errorCount }，前端可直接复用预览 UI 与 importCommit 落库。
   */
  async importAi(
    teacherId: string,
    classId: string,
    mode: string,
    data: string,
    filename: string,
  ) {
    if (!data) throw new BadRequestException('缺少文件数据')
    const ext = (filename || '').split('.').pop() || ''
    let text = ''

    if (mode === 'image') {
      const mime = /png/i.test(ext)
        ? 'image/png'
        : /jpe?g/i.test(ext)
          ? 'image/jpeg'
          : 'image/png'
      text = await this.ai.recognizeImage(teacherId, `data:${mime};base64,${data}`)
    } else {
      const buf = Buffer.from(data, 'base64')
      if (/xlsx?/i.test(ext)) {
        text = await this.ai.parseExcel(buf)
      } else {
        text = buf.toString('utf-8')
      }
    }

    let parsed: any[] = []
    try {
      parsed = await this.ai.parse(teacherId, { text, instruction: GRADE_INSTRUCTION })
    } catch (e: any) {
      throw new BadRequestException('AI 解析失败：' + (e?.message || e))
    }
    if (!Array.isArray(parsed)) parsed = []

    // 查询班级学生并匹配
    const students = await this.stuRepo.find({ where: { classId } as any, take: 500 })
    const byNo = new Map(students.map((s) => [s.studentNo, s]))
    const byName = new Map(students.map((s) => [s.name, s]))

    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    parsed.forEach((raw, i) => {
      const name = String(raw?.name || '').trim()
      const studentNo = String(raw?.studentNo || '').trim()
      const scoreRaw = String(raw?.score ?? '').trim()
      const stu =
        (studentNo && byNo.get(studentNo)) ||
        (name && byName.get(name)) ||
        undefined
      let error = ''
      let score: number | null = null
      if (!stu) error = '找不到对应学生（按学号/姓名）'
      else if (scoreRaw === '') {
        /* 缺考视为空，允许 */
      } else if (!/^\d+(\.\d+)?$/.test(scoreRaw)) {
        error = '分数须为数字'
      } else {
        score = Number(scoreRaw)
        if (score < 0 || score > 1000) error = '分数超出合理范围(0-1000)'
      }
      if (error) errorCount++
      else validCount++
      rows.push({
        studentId: stu ? stu.id : null,
        name: stu ? stu.name : (name || studentNo),
        studentNo: stu ? stu.studentNo : studentNo,
        score,
        line: i + 1,
        valid: !error,
        error,
      })
    })
    return { rows, validCount, errorCount, total: parsed.length }
  }
}

@Roles('teacher')
@Feature('grades')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('grades')
class GradesController extends CrudController<Grade> {
  constructor(s: GradesService) {
    super(s)
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard)
  merge(@Body() dto: any, @CurrentTeacher() t: any) {
    return (this.service as GradesService).mergeGrade(t.sub, dto)
  }

  @Post('import-preview')
  @UseGuards(JwtAuthGuard)
  importPreview(
    @Body() body: { classId: string; filename: string; data: string },
    @CurrentTeacher() t: any,
  ) {
    if (!body?.classId || !body?.filename || !body?.data)
      throw new BadRequestException('缺少必要参数')
    return (this.service as GradesService).importPreview(
      t.sub,
      body.classId,
      body.filename,
      body.data,
    )
  }

  @Post('import-commit')
  @UseGuards(JwtAuthGuard)
  importCommit(@Body() body: any, @CurrentTeacher() t: any) {
    if (!body?.classId || !body?.examName || !body?.subject)
      throw new BadRequestException('缺少班级/考试/科目')
    if (!Array.isArray(body.rows) || !body.rows.length)
      throw new BadRequestException('没有可导入的数据')
    return (this.service as GradesService).importGrades(t.sub, body)
  }

  /** AI 识别成绩单：图片 OCR / Excel / CSV → AI 结构化 → 匹配学生 → 预览 */
  @Post('import-ai')
  @UseGuards(JwtAuthGuard)
  importAi(
    @Body() body: { classId: string; mode: string; data: string; filename?: string },
    @CurrentTeacher() t: any,
  ) {
    if (!body?.classId || !body?.mode || !body?.data)
      throw new BadRequestException('缺少必要参数')
    return (this.service as GradesService).importAi(
      t.sub,
      body.classId,
      body.mode,
      body.data,
      body.filename || '',
    )
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Grade, Student, ClassItem]), ClassMembersModule, AiModule],
  providers: [GradesService],
  controllers: [GradesController],
})
export class GradesModule {}
