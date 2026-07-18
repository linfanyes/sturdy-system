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
import { Student } from './student.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import * as XLSX from 'xlsx'

class StudentsService extends CrudService<Student> {
  constructor(
    @InjectRepository(Student) repo: Repository<Student>,
    @InjectDataSource() private readonly dataSource: DataSource,
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

  /** 事务批量写入，任意一行失败整体回滚 */
  async importStudents(teacherId: string, classId: string, items: any[]) {
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Student)
      const ids: string[] = []
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
      }
      return { count: ids.length, ids }
    })
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
}

@Module({
  imports: [TypeOrmModule.forFeature([Student])],
  providers: [StudentsService],
  controllers: [StudentsController],
})
export class StudentsModule {}
