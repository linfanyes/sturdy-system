import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import { Student } from './student.entity'
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { ClassMemberService, ClassMembersModule } from '../class-members/class-members.module'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { AiModule } from '../ai/ai.module'
import { AiService } from '../ai/ai.service'
import * as XLSX from 'xlsx'

// 学生名单 AI 识别指令：约束模型输出 [{name,gender,studentNo,parentName,parentPhone}] 结构
const STUDENT_INSTRUCTION = `这是一份学生名单（图片 OCR 或文件提取后的文本），请识别其中每个学生并输出 JSON 数组。每个元素结构：
{ "name": "学生姓名(必填)", "gender": "性别：男 或 女", "studentNo": "学号(可选,字母数字组合)", "parentName": "家长姓名(可选)", "parentPhone": "家长电话(可选,纯数字)" }
规则：
- 只识别真实学生行，跳过表头/标题/合计/序号行；
- 性别统一归一化为「男」或「女」（M/m/男→男，F/f/女→女）；
- 学号若图片里没有则留空字符串；
- 家长电话只保留数字，去除空格/横线；
- 只返回 JSON 数组，不要任何解释或前后缀文字。`

class StudentsService extends CrudService<Student> {
  constructor(
    @InjectRepository(Student) repo: Repository<Student>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ai: AiService,
  ) {
    super(repo)
  }

  /** 解析 Excel / TXT / CSV 学生文件，返回校验后的明细 */
  parseFile(filename: string, dataBase64: string) {
    const ext = (filename.split('.').pop() || '').toLowerCase()
    const buf = Buffer.from(dataBase64, 'base64')
    let rawRows: string[][] = []

    if (ext === 'xlsx' || ext === 'xls') {
      const wb = XLSX.read(buf, { type: 'buffer' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
    } else {
      const text = buf.toString('utf-8')
      rawRows = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => l.split(/\t|,/).map((c) => c.trim()))
    }

    // 跳过表头（首格含「姓名」认定为表头）
    if (rawRows.length && /姓名|name/i.test(String(rawRows[0][0]))) {
      rawRows = rawRows.slice(1)
    }

    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    rawRows.forEach((r, i) => {
      const name = String(r[0] || '').trim()
      let gender = String(r[1] || '').trim()
      const studentNo = String(r[2] || '').trim()
      const parentName = String(r[3] || '').trim()
      const parentPhone = String(r[4] || '').trim()
      // 性别归一化
      if (gender === 'M' || gender === 'm' || gender === '男') gender = '男'
      else if (gender === 'F' || gender === 'f' || gender === '女') gender = '女'

      let error = ''
      if (!name) error = '缺少姓名'
      else if (gender !== '男' && gender !== '女') error = '性别须为男/女'
      else if (parentPhone && !/^\d{6,15}$/.test(parentPhone))
        error = '家长电话格式不正确（应為6-15位数字）'
      if (error) errorCount++
      else validCount++
      rows.push({
        name,
        gender,
        studentNo,
        parentName,
        parentPhone,
        line: i + 1,
        valid: !error,
        error,
      })
    })
    return { rows, validCount, errorCount }
  }

  /** 事务批量写入，任意一行失败整体回滚；同步为带家长信息的学生生成 parent-contact 记录 */
  async importStudents(teacherId: string, classId: string, items: any[]) {
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Student)
      const pRepo = manager.getRepository(ParentContact)
      const ids: string[] = []
      let contactCount = 0
      const today = new Date().toISOString().slice(0, 10)
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        const e = new Student()
        Object.assign(e, {
          name: it.name,
          gender: it.gender,
          studentNo: it.studentNo || '',
          parentName: it.parentName || '',
          parentPhone: it.parentPhone || '',
          classId,
          seatNo: i + 1,
          tags: [],
          teacherId,
        })
        const saved = await repo.save(e)
        ids.push(saved.id)

        // 同步生成家长联系记录（至少要有家长姓名或电话）
        if (it.parentName || it.parentPhone) {
          const pc = new ParentContact()
          Object.assign(pc, {
            studentId: saved.id,
            studentName: it.name,
            classId,
            parentName: it.parentName || '家长',
            relation: '家长',
            phone: it.parentPhone || '',
            wechat: '',
            method: it.parentPhone ? '电话' : '其他',
            content: '导入学生时自动建立',
            date: today,
            followUp: '',
            teacherId,
          })
          await pRepo.save(pc)
          contactCount++
        }
      }
      return { count: ids.length, ids, contactCount }
    })
  }

  /**
   * AI 识别学生名单（P3-g/h）：图片走 OCR、Excel/CSV 提取文本，再交给 AI 结构化解析。
   * 返回与 parseFile 一致的 { rows, validCount, errorCount }，前端可直接复用预览 UI 与 commit。
   */
  async importAi(
    teacherId: string,
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
        text = this.ai.parseExcel(buf)
      } else {
        text = buf.toString('utf-8')
      }
    }

    let parsed: any[] = []
    try {
      parsed = await this.ai.parse(teacherId, { text, instruction: STUDENT_INSTRUCTION })
    } catch (e: any) {
      throw new BadRequestException('AI 解析失败：' + (e?.message || e))
    }
    if (!Array.isArray(parsed)) parsed = []

    // 复用 parseFile 的校验逻辑：把 AI 解析出的对象重新组装成「行」再校验
    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    parsed.forEach((raw, i) => {
      const name = String(raw?.name || '').trim()
      let gender = String(raw?.gender || '').trim()
      const studentNo = String(raw?.studentNo || '').trim()
      const parentName = String(raw?.parentName || '').trim()
      let parentPhone = String(raw?.parentPhone || '').trim().replace(/[^\d]/g, '')
      // 性别归一化
      if (gender === 'M' || gender === 'm' || gender === '男') gender = '男'
      else if (gender === 'F' || gender === 'f' || gender === '女') gender = '女'

      let error = ''
      if (!name) error = '缺少姓名'
      else if (gender !== '男' && gender !== '女') error = '性别须为男/女'
      else if (parentPhone && !/^\d{6,15}$/.test(parentPhone))
        error = '家长电话格式不正确（应为6-15位数字）'
      if (error) errorCount++
      else validCount++
      rows.push({
        name,
        gender,
        studentNo,
        parentName,
        parentPhone,
        line: i + 1,
        valid: !error,
        error,
      })
    })
    return { rows, validCount, errorCount }
  }

  /** 切换家长登录权限 */
  async toggleParentLogin(teacherId: string, studentId: string) {
    const s = await this.repo.findOne({ where: { id: studentId, teacherId } })
    if (!s) throw new BadRequestException('学生不存在')
    s.parentLoginEnabled = !s.parentLoginEnabled
    await this.repo.save(s)
    return { studentId, parentLoginEnabled: s.parentLoginEnabled }
  }
}

@Controller('students')
class StudentsController extends CrudController<Student> {
  constructor(s: StudentsService) {
    super(s)
  }

  /** 批量导入：循环创建，返回新建的 id 列表（保留兼容） */
  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  async bulk(@Body() body: { items: any[] }, @CurrentTeacher() t: any) {
    const ids: string[] = []
    for (const item of body.items || []) {
      const created = await this.service.create(t.sub, item)
      ids.push(created.id)
    }
    return { count: ids.length, ids }
  }

  /** 预览：解析并校验文件，不落库 */
  @Post('import')
  @UseGuards(JwtAuthGuard)
  importPreview(@Body() body: { filename: string; data: string }) {
    if (!body?.filename || !body?.data) throw new BadRequestException('缺少文件数据')
    return (this.service as StudentsService).parseFile(body.filename, body.data)
  }

  /** 提交：事务写入已校验数据，失败整体回滚 */
  @Post('import-commit')
  @UseGuards(JwtAuthGuard)
  importCommit(
    @Body() body: { classId: string; items: any[] },
    @CurrentTeacher() t: any,
  ) {
    if (!body?.classId || !Array.isArray(body.items) || !body.items.length) {
      throw new BadRequestException('提交数据为空')
    }
    return (this.service as StudentsService).importStudents(
      t.sub,
      body.classId,
      body.items,
    )
  }

  /**
   * AI 识别学生名单（P3-g/h）：
   * - mode='image' 走 OCR 多模态识别图片中的学生信息
   * - mode='xlsx'/'csv' 等走文件文本提取 + AI 结构化
   * 返回与 /students/import 一致的 { rows, validCount, errorCount }，
   * 前端可直接复用现有预览 UI 与 /students/import-commit 落库。
   */
  @Post('import-ai')
  @UseGuards(JwtAuthGuard)
  importAi(
    @Body() body: { mode: string; data: string; filename?: string },
    @CurrentTeacher() t: any,
  ) {
    if (!body?.mode || !body?.data) {
      throw new BadRequestException('缺少识别数据')
    }
    return (this.service as StudentsService).importAi(
      t.sub,
      body.mode,
      body.data,
      body.filename || '',
    )
  }

  /** 教师开启/关闭该学生的家长登录权限 */
  @Post(':id/toggle-parent-login')
  @UseGuards(JwtAuthGuard)
  async toggleParentLogin(@Param('id') id: string, @CurrentTeacher() t: any) {
    return (this.service as StudentsService).toggleParentLogin(t.sub, id)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Student, ParentContact]), AiModule, ClassMembersModule],
  providers: [StudentsService],
  controllers: [StudentsController],
})
export class StudentsModule {}
