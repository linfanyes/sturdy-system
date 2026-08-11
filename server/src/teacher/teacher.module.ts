import { Module, UseGuards, Controller, Get, Param, Query, NotFoundException } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { Teacher } from './teacher.entity'
import { User } from '../users/user.entity'
import { ClassItem } from '../classes/class.entity'
import { ClassMembersModule, ClassMemberService } from '../class-members/class-members.module'

/** P6：手机号脱敏 —— 保留前 3 后 4，中间用 * 代替；非合法号码原样返回 */
function maskPhone(phone?: string): string {
  if (!phone) return phone || ''
  const p = String(phone).trim()
  if (p.length < 7) return p
  return p.slice(0, 3) + '****' + p.slice(-4)
}

class TeacherService extends CrudService<Teacher> {
  constructor(
    @InjectRepository(Teacher) repo: Repository<Teacher>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
    private readonly memberSvc: ClassMemberService,
  ) {
    super(repo)
  }

  /**
   * 通讯录列表：对非本人记录的手机号脱敏（P6）。
   * 本人记录（teacherId === viewerId）保留完整手机号，方便自己查看/编辑。
   */
  async findAll(viewerId: string, classId?: string, skip = 0, take = 500, term?: string, date?: string) {
    const result = await super.findAll(viewerId, classId, skip, take, term, date)
    const items = (result.items || []).map((it: any) => {
      if (it.teacherId === viewerId) return it
      return { ...it, phone: maskPhone(it.phone) }
    })
    return { items, total: result.total }
  }

  /**
   * 老师详情：聚合通讯录信息 + 学校账号（手机号/性别/邮箱/科目/教师编号）+ 任课班级明细 + 班主任身份。
   * 支持两种 ID：
   *   - 学校账号 id（?userId=xxx，推荐）：家长端和校管端通常持有 userId
   *   - 通讯录 id（/teachers/:id）：回退方案，再用 name/phone 在 User 表匹配账号
   */
  async getDetail(id: string, viewerId: string, userId?: string) {
    // 1) 优先用 userId 查 User 账号（最常用）
    let user: User | null = null
    if (userId) {
      user = await this.userRepo.findOne({ where: { id: userId } })
    }
    // 2) 若只传通讯录 id，查通讯录，再用 name/phone 在 User 表匹配
    let teacher: Teacher | null = null
    if (id) {
      try { teacher = await this.repo.findOne({ where: { id } as any }) } catch {}
    }
    if (!user && teacher) {
      // 通讯录记录的 teacherId 是「创建者」，不是该老师本人，故不能直接用
      // 改用 name + phone 在 User 表匹配（同一学校内姓名+手机号基本唯一）
      const candidates = await this.userRepo.find({ where: { name: teacher.name } })
      if (candidates.length === 1) {
        user = candidates[0]
      } else if (candidates.length > 1 && teacher.phone) {
        user = candidates.find(c => c.phone === teacher!.phone) || candidates[0]
      }
    }
    if (!user && !teacher) throw new NotFoundException('教师不存在')
    if (!user) {
      // 有通讯录但匹配不到 User 账号：仅返回通讯录信息
      return this.buildFromTeacherOnly(teacher!, viewerId)
    }
    return this.buildFromUser(user, viewerId)
  }

  /** 仅基于通讯录记录构建（无 User 账号匹配时） */
  private buildFromTeacherOnly(t: Teacher, viewerId: string) {
    const isSelf = !!t.teacherId && t.teacherId === viewerId
    return {
      id: t.id,
      teacherId: '',
      name: t.name,
      position: t.position,
      phone: isSelf ? t.phone : maskPhone(t.phone),
      email: t.email,
      gender: '',
      avatar: t.avatar || '🧑',
      joinAt: t.joinAt,
      remark: t.remark,
      subjects: t.subjects || [],
      teachings: (t.teachings || []).map(te => ({ classId: te.classId, subject: te.subject, className: te.classId, term: '' })),
      headClasses: [],
      isStarred: t.isStarred,
      school: '',
      schoolId: '',
      teacherNo: '',
      motto: '',
    }
  }

  /** 基于 User 账号构建详情（含任课班级 + 班主任身份） */
  private async buildFromUser(u: User, viewerId: string) {
    let teachings: any[] = []
    let headClasses: any[] = []
    try {
      const memberClassIds = await this.memberSvc.getClassIdsByTeacher(u.id)
      if (memberClassIds.length) {
        const cs = await this.classRepo.find({ where: { id: In(memberClassIds) } })
        teachings = cs.map(c => ({ classId: c.id, subject: u.subject, className: c.name, term: c.term }))
        headClasses = (await Promise.all(
          memberClassIds.map(async cid => {
            const role = await this.memberSvc.getRole(u.id, cid)
            if (role === 'head') {
              const c = cs.find(x => x.id === cid)
              return { classId: cid, className: c?.name || cid, term: c?.term || '' }
            }
            return null
          }),
        )).filter(Boolean) as any[]
      }
    } catch {}
    return {
      id: u.id,
      teacherId: u.id,
      name: u.name,
      position: '',
      email: u.email,
      gender: u.gender,
      avatar: u.avatar || '🧑',
      joinAt: '',
      remark: '',
      subjects: u.subjects || (u.subject ? [u.subject] : []),
      teachings,
      headClasses,
      isStarred: false,
      school: u.school,
      schoolId: u.schoolId,
      teacherNo: u.teacherNo,
      motto: u.motto,
      phone: u.id === viewerId ? u.phone : maskPhone(u.phone),
    }
  }
}

@Roles('teacher', 'school_admin')
@Feature('teachers')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('teachers')
class TeacherController extends CrudController<Teacher> {
  constructor(s: TeacherService) {
    super(s)
  }

  /** 教师详情：聚合账号 + 通讯录 + 任课班级 */
  @Get(':id/detail')
  detail(@Param('id') id: string, @CurrentTeacher() t: any, @Query('userId') userId?: string) {
    return (this.service as TeacherService).getDetail(id, t.sub, userId)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Teacher, User, ClassItem]), ClassMembersModule],
  providers: [TeacherService],
  controllers: [TeacherController],
  exports: [TeacherService],
})
export class TeacherModule {}
