import { Module, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { InjectDataSource } from '@nestjs/typeorm'
import { Controller, Post, Get, Patch, Delete, Param, Body, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { ClassItem } from './class.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'
import { ClassMemberService, ClassMembersModule } from '../class-members/class-members.module'
import { User } from '../users/user.entity'
import { Student } from '../students/student.entity'
import { Notice } from '../school/school.entity'
import { Grade } from '../grades/grade.entity'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { FeatureService } from '../common/feature/feature.service'
import { PARENT_FEATURE_KEYS, PARENT_FEATURE_OPTIONS } from '../common/feature/feature-flags.constants'

class ClassesService extends CrudService<ClassItem> {
  constructor(
    @InjectRepository(ClassItem) repo: Repository<ClassItem>,
    private readonly classMemberSvc2: ClassMemberService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Notice) private readonly noticeRepo: Repository<Notice>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly featureSvc: FeatureService,
  ) {
    super(repo)
    this.withClassMemberService(classMemberSvc2)
  }

  /** 班级是班级维度实体 */
  protected isClassScopedEntity(): boolean {
    return true
  }

  /** 列表回填每个班级的学生人数（教师端 GET /classes 也携带 studentCount，两端一致） */
  override async findAll(teacherId: string, classId?: string, skip = 0, take = 500, term?: string, date?: string) {
    const res = await super.findAll(teacherId, classId, skip, take, term, date)
    const items = res.items as any[]
    if (items.length) {
      const counts: Array<{ classId: string; cnt: string }> = await this.studentRepo
        .createQueryBuilder('s')
        .select('s.classId', 'classId')
        .addSelect('COUNT(*)', 'cnt')
        .where('s.classId IN (:...ids)', { ids: items.map(i => i.id) })
        .groupBy('s.classId')
        .getRawMany()
      const cntByClass = new Map(counts.map(r => [r.classId, Number(r.cnt) || 0]))
      for (const item of items) item.studentCount = cntByClass.get(item.id) || 0
    }
    return res
  }

  /**
   * 班级实体本身没有 classId 列：其 id 即是班级 id。
   * 按"教师可访问的班级集合"过滤时，应使用 id 而非 classId，避免
   * "Property classId was not found in ClassItem" 导致 GET /classes 崩溃。
   */
  protected classScopeField(): 'classId' | 'id' {
    return 'id'
  }

  /**
   * 禁止老师端自建班级：班主任身份必须由学校管理员指定（createClass 接口）。
   * 老师 self-service 建班会绕过校管授权，导致权责不清。
   * 如需建班请走 POST /school-admin/classes（需校管登录态）。
   */
  async create(teacherId: string, dto: any): Promise<ClassItem> {
    throw new ForbiddenException('班级需由学校管理员创建并指定班主任，请联系校管')
  }

  /**
   * 覆盖 update：仅班主任（role='head'）可编辑班级基本信息。
   * 同班科任老师只能查看，不能编辑（防止越权改别人创建的班级）。
   */
  async update(id: string, teacherId: string, dto: any) {
    await this.assertHeadTeacher(teacherId, id)
    // 班主任不允许通过此接口转交班级（转交需校管操作，避免误操作）
    const safeDto = { ...dto }
    delete safeDto.teacherId
    delete safeDto.headTeacherId
    return super.update(id, teacherId, safeDto)
  }

  /**
   * 覆盖 remove：仅班主任可删除自己创建的班级。
   * 删除时清理该班级所有学期的成员关系。
   */
  async remove(id: string, teacherId: string) {
    await this.assertHeadTeacher(teacherId, id)
    // 删除班级同时清理所有学期的成员关系（并行）
    const members = await this.classMemberSvc.listByClass(id)
    await Promise.all(members.map((m) => this.classMemberSvc.removeMember(m.teacherId, id, m.term)))
    // P3-2: 级联删除班级下的考试和成绩数据，避免孤儿数据累积
    try {
      await this.dataSource.query(`DELETE FROM grades WHERE classId = ?`, [id])
      await this.dataSource.query(`DELETE FROM exams WHERE classId = ?`, [id])
    } catch { /* 忽略 */ }
    return super.remove(id, teacherId)
  }

  /** 校验当前教师是该班级的班主任（role='head'，按班级当前学期判断） */
  private async assertHeadTeacher(teacherId: string, classId: string) {
    const cls = await this.repo.findOne({ where: { id: classId } as any })
    const term = cls?.term || ''
    const role = await this.classMemberSvc.getRole(teacherId, classId, term)
    if (role !== 'head') {
      throw new ForbiddenException('仅班主任可执行此操作')
    }
  }

  /** 查询班级成员列表（含教师姓名）：教师走班级归属校验，校管按「班级→教师→学校」归属校验 */
  async listMembers(classId: string, user: any) {
    const isSchoolAdmin = user?.role === 'school_admin'
    if (isSchoolAdmin) {
      const cls = await this.repo.findOne({ where: { id: classId } as any })
      if (!cls) throw new NotFoundException('班级不存在')
      const head = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId: user.schoolId } as any })
      if (!head) throw new ForbiddenException('无权访问该班级')
    } else {
      // 班主任或同班科任老师均可查看成员列表
      const canAccess = await this.classMemberSvc.canAccess(user.sub, classId)
      if (!canAccess) throw new ForbiddenException('无权访问该班级')
    }
    const members = await this.classMemberSvc.listByClass(classId)
    if (!members.length) return []
    const teacherIds = members.map(m => m.teacherId)
    const teachers = await this.userRepo.find({ where: teacherIds.map(id => ({ id })) as any })
    const teacherMap = new Map(teachers.map(t => [t.id, t]))
    return members.map(m => ({
      teacherId: m.teacherId,
      teacherName: teacherMap.get(m.teacherId)?.name || '未知',
      role: m.role,
      subjects: m.subjects || [],
      className: m.className,
    }))
  }

  /** 班主任添加科任老师到班级（按班级当前学期） */
  async addSubjectTeacher(classId: string, headTeacherId: string, body: { teacherId: string; subjects?: string[] }) {
    await this.assertHeadTeacher(headTeacherId, classId)
    if (!body?.teacherId) throw new BadRequestException('请选择要添加的教师')
    const cls = await this.repo.findOne({ where: { id: classId } as any })
    if (!cls) throw new BadRequestException('班级不存在')
    const target = await this.userRepo.findOne({ where: { id: body.teacherId } as any })
    if (!target) throw new BadRequestException('被添加的教师不存在')
    // 同校校验
    if (target.schoolId !== (await this.userRepo.findOne({ where: { id: headTeacherId } as any }))?.schoolId) {
      throw new BadRequestException('只能添加本校教师')
    }
    await this.classMemberSvc.addSubjectTeacher(body.teacherId, classId, cls.name, body.subjects || [], cls.term || '')
    return { ok: true }
  }

  /** 班主任移除科任老师（按班级当前学期） */
  async removeSubjectTeacher(classId: string, headTeacherId: string, memberTeacherId: string) {
    await this.assertHeadTeacher(headTeacherId, classId)
    const cls = await this.repo.findOne({ where: { id: classId } as any })
    const term = cls?.term || ''
    // 不能移除自己（班主任）
    if (memberTeacherId === headTeacherId) {
      throw new BadRequestException('不能移除自己（班主任），如需转交请联系学校管理员')
    }
    // 校验被移除者不是班主任
    const targetRole = await this.classMemberSvc.getRole(memberTeacherId, classId, term)
    if (targetRole === 'head') {
      throw new BadRequestException('不能移除班主任，如需转交请联系学校管理员')
    }
    await this.classMemberSvc.removeMember(memberTeacherId, classId, term)
    return { ok: true }
  }

  /**
   * 教师更新自己在某班级的任教学科（班主任可兼任本班科任，自行管理任教学科）。
   * 校验调用者是该班级成员（班主任或科任老师）。
   */
  async updateMySubjects(classId: string, teacherId: string, subjects: string[]) {
    const cls = await this.repo.findOne({ where: { id: classId } as any })
    if (!cls) throw new BadRequestException('班级不存在')
    const term = cls.term || ''
    const canAccess = await this.classMemberSvc.canAccess(teacherId, classId, term)
    if (!canAccess) throw new ForbiddenException('无权操作此班级')
    return this.classMemberSvc.updateMySubjects(teacherId, classId, subjects, term)
  }

  /**
   * 查询本校教师列表（供班主任添加科任老师时选择）。
   * 基于当前教师的 schoolId 查询同校教师，仅返回 id/name/teacherNo 等基本字段。
   */
  async listSchoolTeachers(teacherId: string) {
    const me = await this.userRepo.findOne({ where: { id: teacherId } as any })
    if (!me || !me.schoolId) return []
    const teachers = await this.userRepo.find({
      where: { schoolId: me.schoolId, enabled: true } as any,
      select: ['id', 'name', 'teacherNo', 'username'] as any,
      order: { name: 'ASC' } as any,
      take: 500,
    })
    // 排除自己
    return teachers.filter(t => t.id !== teacherId).map(t => ({
      id: t.id,
      name: t.name,
      teacherNo: t.teacherNo || '',
      username: t.username || '',
    }))
  }

  /**
   * 班主任为同班科任老师指定/修改任教学科。
   * 仅班主任可操作；不能修改班主任自己的学科（班主任学科走 updateMySubjects）。
   */
  async updateMemberSubjects(classId: string, headTeacherId: string, memberTeacherId: string, subjects: string[]) {
    await this.assertHeadTeacher(headTeacherId, classId)
    if (memberTeacherId === headTeacherId) {
      throw new BadRequestException('不能修改班主任自己的学科，请在「我的任教学科」中自行更新')
    }
    const cls = await this.repo.findOne({ where: { id: classId } as any })
    if (!cls) throw new BadRequestException('班级不存在')
    const term = cls.term || ''
    // 校验被操作者是同班成员
    const role = await this.classMemberSvc.getRole(memberTeacherId, classId, term)
    if (!role) throw new BadRequestException('该教师不是本班成员')
    if (role === 'head') throw new BadRequestException('不能修改其他班主任的学科')
    return this.classMemberSvc.updateMySubjects(memberTeacherId, classId, subjects, term)
  }

  /**
   * 班级数据看板：班主任看全班汇总，科任老师只看自己学科相关。
   * 汇总：学生人数、班级成员、各科成绩概览、近期公告。
   */
  async getDashboard(classId: string, teacherId: string) {
    const cls = await this.repo.findOne({ where: { id: classId } as any })
    if (!cls) throw new BadRequestException('班级不存在')
    const term = cls.term || ''
    // 权限校验：班主任或同班科任均可查看
    const canAccess = await this.classMemberSvc.canAccess(teacherId, classId, term)
    if (!canAccess) throw new ForbiddenException('无权访问该班级')
    const role = await this.classMemberSvc.getRole(teacherId, classId, term)
    const isHead = role === 'head'

    // 学生人数
    const studentCount = await this.studentRepo.count({ where: { classId } as any })

    // 班级成员（班主任看全部，科任只看自己）
    const members = isHead
      ? await this.classMemberSvc.listByClass(classId, term)
      : await this.classMemberSvc.listByClass(classId, term).then(ms => ms.filter(m => m.teacherId === teacherId))

    // 各科成绩概览：按 subject 聚合平均分
    const grades = await this.gradeRepo.find({ where: { classId } as any, take: 200 })
    const subjectStats: { subject: string; count: number; avg: number }[] = []
    const bySubject = new Map<string, number[]>()
    for (const g of grades) {
      for (const s of (g.scores || [])) {
        if (s.score == null) continue
        if (!bySubject.has(g.subject)) bySubject.set(g.subject, [])
        bySubject.get(g.subject)!.push(s.score)
      }
    }
    for (const [subject, scores] of bySubject) {
      // 科任老师只看自己任教学科
      if (!isHead) {
        const mySubjects = members.find(m => m.teacherId === teacherId)?.subjects || []
        if (!mySubjects.includes(subject)) continue
      }
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      subjectStats.push({ subject, count: scores.length, avg: Math.round(avg * 10) / 10 })
    }

    // 近期公告（班主任看全部班级公告，科任只看自己发的）
    const noticeWhere: any = { classId, scope: 'class' }
    if (!isHead) noticeWhere.teacherId = teacherId
    const recentNotices = await this.noticeRepo.find({
      where: noticeWhere,
      order: { createdAt: 'DESC' } as any,
      take: 5,
      select: ['id', 'title', 'pinned', 'createdAt'] as any,
    })

    return {
      className: cls.name,
      term,
      role,
      studentCount,
      members: members.map(m => ({
        teacherId: m.teacherId,
        role: m.role,
        subjects: m.subjects || [],
      })),
      subjectStats,
      recentNotices,
    }
  }

  /**
   * 家长功能包管理：获取某班级的家长功能包配置（班级成员可查看）。
   * - configured=false → 未显式配置，家长跟随默认（班级教师功能并集 ∩ 学校级）
   * - configured=true  → 班主任显式指定的家长可见功能（空数组=关闭全部）
   */
  async getParentFeatures(classId: string, teacherId: string) {
    const cls = await this.repo.findOne({ where: { id: classId } as any })
    if (!cls) throw new BadRequestException('班级不存在')
    const canAccess = await this.classMemberSvc.canAccess(teacherId, classId, cls.term || '')
    if (!canAccess) throw new ForbiddenException('无权访问该班级')
    return {
      configured: Array.isArray(cls.parentFeatures),
      features: Array.isArray(cls.parentFeatures) ? cls.parentFeatures : null,
      options: PARENT_FEATURE_OPTIONS,
    }
  }

  /**
   * 家长功能包管理：班主任为班级家长显式指定可见功能。
   * - features=null/undefined → 恢复「跟随默认」（清空显式配置）
   * - features=[]            → 关闭该班家长端全部功能
   * - 非空数组               → 仅开放数组内功能（仍受学校级 featureFlags 收窄）
   * 保存后清除该班级所有家长的功能缓存，使其下次请求立即生效。
   */
  async updateParentFeatures(classId: string, headTeacherId: string, features: string[] | null) {
    await this.assertHeadTeacher(headTeacherId, classId)
    const cls = await this.repo.findOne({ where: { id: classId } as any })
    if (!cls) throw new BadRequestException('班级不存在')
    let next: string[] | null
    if (features == null) {
      next = null
    } else {
      const arr = Array.isArray(features) ? features : []
      const valid = new Set(PARENT_FEATURE_KEYS)
      const unknown = arr.filter((k) => !valid.has(k))
      if (unknown.length) throw new BadRequestException(`包含无效的功能包：${unknown.join('、')}`)
      next = [...new Set(arr)]
    }
    cls.parentFeatures = next
    await this.repo.save(cls)
    // 清除该班级所有家长的功能缓存（下次请求按新配置重新解析）
    await this.featureSvc.clearParentCacheForClass(classId)
    return { ok: true, features: cls.parentFeatures }
  }
}

@Roles('teacher')
@Feature('classes')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('classes')
class ClassesController extends CrudController<ClassItem> {
  constructor(private readonly s: ClassesService) {
    super(s)
  }

  /** 查询班级成员列表（用 POST 避免与基类 GET :id 路由冲突；教师/校管均可查看） */
  @Post(':id/members/list')
  @Roles('teacher', 'school_admin')
  listMembers(@Param('id') id: string, @CurrentTeacher() t: any) {
    return this.s.listMembers(id, t)
  }

  /** 查询本校教师列表（供班主任添加科任老师时选择） */
  @Post('school-teachers')
  listSchoolTeachers(@CurrentTeacher() t: any) {
    return this.s.listSchoolTeachers(t.sub)
  }

  /** 班主任添加科任老师 */
  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() body: any, @CurrentTeacher() t: any) {
    return this.s.addSubjectTeacher(id, t.sub, body)
  }

  /** 班主任移除科任老师 */
  @Delete(':id/members/:teacherId')
  removeMember(@Param('id') id: string, @Param('teacherId') teacherId: string, @CurrentTeacher() t: any) {
    return this.s.removeSubjectTeacher(id, t.sub, teacherId)
  }

  /** 教师更新自己在某班级的任教学科（班主任可兼任本班科任） */
  @Patch(':id/my-subjects')
  updateMySubjects(@Param('id') id: string, @Body() body: any, @CurrentTeacher() t: any) {
    return this.s.updateMySubjects(id, t.sub, body.subjects || [])
  }

  /** 班主任为同班科任老师指定/修改任教学科 */
  @Patch(':id/members/:teacherId/subjects')
  updateMemberSubjects(
    @Param('id') id: string,
    @Param('teacherId') teacherId: string,
    @Body() body: any,
    @CurrentTeacher() t: any,
  ) {
    return this.s.updateMemberSubjects(id, t.sub, teacherId, body.subjects || [])
  }

  /** 班级数据看板（班主任看全班汇总，科任只看自己学科相关） */
  @Get(':id/dashboard')
  getDashboard(@Param('id') id: string, @CurrentTeacher() t: any) {
    return this.s.getDashboard(id, t.sub)
  }

  /** 家长功能包管理：获取班级家长功能包配置（班级成员可查看） */
  @Get(':id/parent-features')
  getParentFeatures(@Param('id') id: string, @CurrentTeacher() t: any) {
    return this.s.getParentFeatures(id, t.sub)
  }

  /** 家长功能包管理：班主任更新班级家长功能包（features=null 恢复跟随默认） */
  @Patch(':id/parent-features')
  updateParentFeatures(@Param('id') id: string, @Body() body: any, @CurrentTeacher() t: any) {
    return this.s.updateParentFeatures(id, t.sub, body?.features == null ? null : body.features)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([ClassItem, User, Student, Notice, Grade]), ClassMembersModule],
  providers: [ClassesService],
  controllers: [ClassesController],
})
export class ClassesModule {}
