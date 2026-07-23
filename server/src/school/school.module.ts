import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, Not } from 'typeorm'
import { Controller, Post, Get, Query, Body, UseGuards, BadRequestException } from '@nestjs/common'
import {
  ScheduleItem,
  Attendance,
  Homework,
  Notice,
  Resource,
} from './school.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { AiModule } from '../ai/ai.module'
import { AiService } from '../ai/ai.service'
import { SecurityModule, SecurityService } from '../security/security.module'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'

class ScheduleService extends CrudService<ScheduleItem> {
  constructor(@InjectRepository(ScheduleItem) repo: Repository<ScheduleItem>) {
    super(repo)
  }
}
@Controller('schedules')
class ScheduleController extends CrudController<ScheduleItem> {
  constructor(s: ScheduleService) {
    super(s)
  }
}

class AttendanceService extends CrudService<Attendance> {
  constructor(@InjectRepository(Attendance) repo: Repository<Attendance>) {
    super(repo)
  }
}
@Controller('attendances')
class AttendanceController extends CrudController<Attendance> {
  constructor(s: AttendanceService) {
    super(s)
  }
}

class HomeworkService extends CrudService<Homework> {
  constructor(@InjectRepository(Homework) repo: Repository<Homework>) {
    super(repo)
  }
}
@Controller('homework')
class HomeworkController extends CrudController<Homework> {
  constructor(s: HomeworkService) {
    super(s)
  }
}

class NoticeService extends CrudService<Notice> {
  constructor(@InjectRepository(Notice) repo: Repository<Notice>) {
    super(repo)
  }
}
@Controller('notices')
class NoticeController extends CrudController<Notice> {
  constructor(
    s: NoticeService,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
    @InjectRepository(Notice) private readonly noticeRepo: Repository<Notice>,
    private readonly sec: SecurityService,
  ) {
    super(s)
  }

  /** 推送通知微信订阅消息给已订阅的家长 */
  @Post('push')
  @UseGuards(JwtAuthGuard)
  async push(@CurrentTeacher() t: any, @Body() b: { noticeId: string; classId: string; title: string; content: string }) {
    // 仅允许向当前教师本人任教的班级推送，防止越权读取其他教师班级的学生 PII
    const owned = await this.classRepo.findOne({ where: { id: b.classId, teacherId: t.sub } } as any)
    if (!owned) return { pushed: 0, error: '班级不存在或无权访问' }
    const students = await this.studentRepo.find({
      where: { classId: b.classId, parentOpenId: Not('') },
    })
    const openIds = students.map(s => s.parentOpenId).filter(Boolean)
    const result = await this.sec.pushNotice({ title: b.title, content: b.content }, openIds)
    return { pushed: result.sent, total: result.total }
  }

  /** 支持 scope=school 过滤学校公告 */
  @Get()
  async findAll(@CurrentTeacher() t: any, @Query('classId') classId?: string,
    @Query('scope') scope?: string, @Query('skip') skip?: string, @Query('take') take?: string) {
    if (scope === 'school') {
      // 学校级公告：用教师所在的 schoolId 过滤（不限制 teacherId 归属）
      // 返回所有 scope='school' 的公告
      const [items, total] = await this.noticeRepo.findAndCount({
        where: { scope: 'school' },
        order: { createdAt: 'DESC' } as any,
        skip: Number(skip) || 0, take: Math.min(Number(take) || 500, 500),
      })
      return { items, total }
    }
    return this.service.findAll(t.sub, classId, Number(skip) || 0, Math.min(Number(take) || 500, 500))
  }
}

class ResourceService extends CrudService<Resource> {
  constructor(@InjectRepository(Resource) repo: Repository<Resource>) {
    super(repo)
  }
}
@Controller('resources')
class ResourceController extends CrudController<Resource> {
  constructor(s: ResourceService) {
    super(s)
  }
}

/** 把 AI 输出/原始值归一化为 0-6 的星期（周一=0，周日=6） */
function normDay(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') {
    if (v >= 1 && v <= 7) return v - 1 // 1=周一..7=周日 → 0..6
    if (v >= 0 && v <= 6) return v
    return null
  }
  const s = String(v).trim()
  const n = Number(s)
  if (!Number.isNaN(n) && s !== '') {
    if (n >= 1 && n <= 7) return n - 1
    if (n >= 0 && n <= 6) return n
  }
  const map: Record<string, number> = {
    一: 0, 二: 1, 三: 2, 四: 3, 五: 4, 六: 5, 日: 6, 天: 6,
  }
  for (const k of Object.keys(map)) if (s.includes(k)) return map[k]
  const en = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const lower = s.toLowerCase()
  const idx = en.findIndex((e) => lower.includes(e))
  if (idx >= 0) return idx
  return null
}

/** 识别非数字节次名（早读/晨读/晚自习/晚修等），返回排序用的 period 与展示名 */
function detectSectionWord(s: string): { period: number; section: string } | null {
  if (!s) return null
  const map: [RegExp, string, number][] = [
    [/早读|晨读|早自习|早练|晨练|晨/, '早读', 0],
    [/午休|午练|午读|午/, '午休', 50],
    [/晚自习|晚修|晚自修|晚课|晚/, '晚自习', 99],
  ]
  for (const [re, name, order] of map) if (re.test(s)) return { period: order, section: name }
  return null
}

/**
 * 解析节次：优先识别早读/晚自习等文字节次；否则取 period 中的数字作为普通节次。
 * 返回 { period: 排序序号, section: 展示名|null }
 */
function resolveSection(rawPeriod: any, rawSection: any): { period: number; section: string | null } | null {
  const secText = String(rawSection ?? '').trim()
  const perText = String(rawPeriod ?? '').trim()
  const fromWord = detectSectionWord(secText) || detectSectionWord(perText)
  if (fromWord) return fromWord
  const m = perText.match(/\d+/)
  if (!m) return null
  const n = parseInt(m[0], 10)
  return n >= 1 ? { period: n, section: null } : null
}

/** 归一化周次类型：all/single/double（兼容中英文与「单/双/全」关键字） */
function normWeekType(v: any): string {
  const s = String(v ?? '').trim().toLowerCase()
  if (!s || s === 'all' || s === '全周' || s === '每周' || s === '整周' || s.includes('全'))
    return 'all'
  if (s === 'single' || s === '单周' || s.includes('单')) return 'single'
  if (s === 'double' || s === '双周' || s.includes('双')) return 'double'
  return 'all'
}

const SCHEDULE_INSTRUCTION = `这是一份课程表，请识别其中每一节课并输出 JSON 数组。每个元素结构：
{ "dayOfWeek": 数字(周一=1,周二=2,...,周日=7), "period": 数字(第几节,从1开始), "section": "非数字节次名(可选,如 早读/晨读/晚自习/晚修;普通第几节留空)", "subject": "科目名称(如 语文/数学/英语)", "teacher": "任课教师姓名(可选)", "note": "备注(可选)", "weekType": "周次类型: 'all'表示全周都有, 'single'表示仅单周, 'double'表示仅双周(若课表未区分单双周默认 all)" }
规则：
- 只识别真实课程格，空单元格跳过；
- dayOfWeek 用 1-7；普通数字节次 period 用正整数、section 留空；若节次是「早读/晨读」则 section 填"早读"且 period 填 0，若是「晚自习/晚修」则 section 填"晚自习"且 period 填 99；
- 若某一格课程分单双周（如单周语文/双周数学），请拆成两条，分别填写 weekType='single'/'double' 与各自 subject；
- 只返回 JSON 数组，不要任何解释或前后缀文字。`

class ScheduleImportService {
  constructor(
    @InjectRepository(ScheduleItem) private readonly repo: Repository<ScheduleItem>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ai: AiService,
  ) {}

  /**
   * 识别阶段：图片走 OCR、Excel/CSV 提取文本，再交给 AI 结构化解析为课程条目。
   * 仅校验，不落库；返回 { items: 有效条目, errors: 异常明细 }。
   */
  async importAi(
    teacherId: string,
    classId: string,
    mode: string,
    data: string,
    filename: string,
  ) {
    if (!classId) throw new BadRequestException('缺少班级')
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
        text = this.ai.parseExcel(buf)
      } else {
        text = buf.toString('utf-8')
      }
    }

    let parsed: any[] = []
    try {
      parsed = await this.ai.parse(teacherId, { text, instruction: SCHEDULE_INSTRUCTION })
    } catch (e: any) {
      throw new BadRequestException('AI 解析失败：' + (e?.message || e))
    }
    if (!Array.isArray(parsed)) parsed = []

    const items: any[] = []
    const errors: any[] = []
    parsed.forEach((raw, i) => {
      const day = normDay(raw?.dayOfWeek)
      const sec = resolveSection(raw?.period, raw?.section)
      const subject = String(raw?.subject || '').trim()
      const rowNo = i + 1
      if (day === null) {
        errors.push({ row: rowNo, reason: `星期无法识别: ${raw?.dayOfWeek}` })
        return
      }
      if (sec === null) {
        errors.push({ row: rowNo, reason: `节次无法识别: ${raw?.period}` })
        return
      }
      if (!subject) {
        errors.push({ row: rowNo, reason: '缺少科目名称' })
        return
      }
      items.push({
        dayOfWeek: day,
        period: sec.period,
        section: sec.section,
        weekType: normWeekType(raw?.weekType),
        subject,
        teacher: String(raw?.teacher || '').trim(),
        note: String(raw?.note || '').trim(),
      })
    })
    return { items, errors }
  }

  /** 提交阶段：按 classId+dayOfWeek+period 幂等 upsert，事务包裹，失败回滚 */
  async commit(teacherId: string, classId: string, items: any[]) {
    if (!classId) throw new BadRequestException('缺少班级')
    if (!Array.isArray(items) || !items.length) throw new BadRequestException('提交数据为空')
    let created = 0
    let updated = 0
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ScheduleItem)
      for (const it of items) {
        const exist = await repo.findOne({
          where: {
            classId,
            dayOfWeek: it.dayOfWeek,
            period: it.period,
            section: it.section || null,
            teacherId,
          },
        })
        if (exist) {
          exist.subject = it.subject
          exist.teacher = it.teacher || ''
          exist.note = it.note || ''
          exist.weekType = it.weekType || 'all'
          exist.section = it.section || null
          await repo.save(exist)
          updated++
        } else {
          const e = new ScheduleItem()
          Object.assign(e, {
            classId,
            teacherId,
            dayOfWeek: it.dayOfWeek,
            period: it.period,
            section: it.section || null,
            weekType: it.weekType || 'all',
            subject: it.subject,
            teacher: it.teacher || '',
            note: it.note || '',
          })
          await repo.save(e)
          created++
        }
      }
    })
    return { created, updated, total: items.length }
  }
}

@Controller('schedules')
class ScheduleImportController {
  constructor(private readonly svc: ScheduleImportService) {}

  @Post('import-ai')
  @UseGuards(JwtAuthGuard)
  importAi(
    @Body() body: { classId: string; mode: string; data: string; filename?: string },
    @CurrentTeacher() t: any,
  ) {
    return this.svc.importAi(t.sub, body.classId, body.mode, body.data, body.filename || '')
  }

  @Post('import-commit')
  @UseGuards(JwtAuthGuard)
  importCommit(
    @Body() body: { classId: string; items: any[] },
    @CurrentTeacher() t: any,
  ) {
    return this.svc.commit(t.sub, body.classId, body.items)
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduleItem, Attendance, Homework, Notice, Resource, Student, ClassItem]),
    AiModule,
    SecurityModule,
  ],
  providers: [
    ScheduleService,
    AttendanceService,
    HomeworkService,
    NoticeService,
    ResourceService,
    ScheduleImportService,
  ],
  controllers: [
    ScheduleController,
    AttendanceController,
    HomeworkController,
    NoticeController,
    ResourceController,
    ScheduleImportController,
  ],
})
export class SchoolModule {}
