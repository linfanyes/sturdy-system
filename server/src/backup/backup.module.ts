import {
  Module,
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  Injectable,
  UseGuards,
} from '@nestjs/common'
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BackupSnapshot } from './backup.entity'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'

// 备份依赖的所有实体（用于导出快照）
import { User } from '../users/user.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { Teacher } from '../teacher/teacher.entity'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { AwardRecord } from '../award/award.entity'
import { NoteItem, TodoItem } from '../notes/notes.entity'
import { AiSettings } from '../config/ai-settings.entity'

@Injectable()
export class BackupService {
  constructor(
    @InjectRepository(BackupSnapshot) private readonly repo: Repository<BackupSnapshot>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(AwardRecord) private readonly awardRepo: Repository<AwardRecord>,
    @InjectRepository(NoteItem) private readonly noteRepo: Repository<NoteItem>,
    @InjectRepository(TodoItem) private readonly todoRepo: Repository<TodoItem>,
    @InjectRepository(AiSettings) private readonly aiRepo: Repository<AiSettings>,
  ) {}

  /** 拉取教师全量数据快照 */
  async snapshot(teacherId: string): Promise<any> {
    const u = await this.userRepo.findOne({ where: { id: teacherId } as any }).catch(() => null)
    const where = { teacherId } as any
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      user: u,
      classes: await this.classRepo.find({ where }).catch(() => []),
      students: await this.studentRepo.find({ where }).catch(() => []),
      teachers: await this.teacherRepo.find({ where }).catch(() => []),
      grades: await this.gradeRepo.find({ where }).catch(() => []),
      exams: await this.examRepo.find({ where }).catch(() => []),
      awards: await this.awardRepo.find({ where }).catch(() => []),
      notes: await this.noteRepo.find({ where }).catch(() => []),
      todos: await this.todoRepo.find({ where }).catch(() => []),
      aiSettings: await this.aiRepo.findOne({ where }).catch(() => null),
    }
  }

  /** 创建备份记录 */
  async create(teacherId: string, type: string, label: string): Promise<BackupSnapshot> {
    const data = await this.snapshot(teacherId)
    const rec = this.repo.create({
      teacherId,
      type,
      label: label || (type === 'auto' ? '自动备份' : '手动备份'),
      payload: JSON.stringify(data),
    })
    const saved = await this.repo.save(rec)
    // 最多保留 10 条手动 + 10 条自动；超出的按时间倒序删除最旧的
    await this.trim(teacherId, 'manual', 10)
    await this.trim(teacherId, 'auto', 10)
    return saved
  }

  private async trim(teacherId: string, type: string, keep: number) {
    const all = await this.repo.find({
      where: { teacherId, type } as any,
      order: { createdAt: 'DESC' } as any,
    })
    if (all.length > keep) {
      const toDel = all.slice(keep)
      await this.repo.remove(toDel).catch(() => null)
    }
  }

  async list(teacherId: string): Promise<BackupSnapshot[]> {
    return this.repo.find({
      where: { teacherId } as any,
      order: { createdAt: 'DESC' } as any,
      take: 50,
    })
  }

  async get(teacherId: string, id: string): Promise<BackupSnapshot | null> {
    return this.repo.findOne({ where: { id, teacherId } as any }).catch(() => null)
  }

  async remove(teacherId: string, id: string): Promise<void> {
    await this.repo.delete({ id, teacherId } as any).catch(() => null)
  }

  /** 触发自动备份（按 teacherId 调用，由 cron 或登录触发） */
  async autoBackup(teacherId: string): Promise<void> {
    try {
      await this.create(teacherId, 'auto', '自动备份 ' + new Date().toLocaleString('zh-CN'))
    } catch {
      /* 静默失败，不影响主流程 */
    }
  }
}

@Roles('teacher')
@UseGuards(JwtAuthGuard)
@Controller('backups')
export class BackupController {
  constructor(private readonly svc: BackupService) {}

  @Get()
  list(@Req() req: any) {
    // JwtAuthGuard 把 { sub, openid } 挂到 req.user；必须使用 sub 作为 teacherId，
    // 否则传入 undefined 会导致 TypeORM 丢弃 WHERE teacherId 条件，越权读取/删除全部租户的备份。
    return this.svc.list(req.user.sub)
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    const r = await this.svc.get(req.user.sub, id)
    if (!r) return { error: 'not found' }
    return r
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    return this.svc.create(req.user.sub, 'manual', body?.label || '手动备份')
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.svc.remove(req.user.sub, id)
    return { ok: true }
  }

  /** 触发自动备份（前端可定期调用） */
  @Post('auto')
  async auto(@Req() req: any) {
    await this.svc.autoBackup(req.user.sub)
    return { ok: true }
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BackupSnapshot,
      User,
      ClassItem,
      Student,
      Teacher,
      Grade,
      Exam,
      AwardRecord,
      NoteItem,
      TodoItem,
      AiSettings,
    ]),
  ],
  providers: [BackupService],
  controllers: [BackupController],
  exports: [BackupService],
})
export class BackupModule {}
