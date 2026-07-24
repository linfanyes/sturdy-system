import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller, Post, Get, Patch, Delete, Param, Body, BadRequestException, ForbiddenException } from '@nestjs/common'
import { ClassItem } from './class.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { ClassMemberService, ClassMembersModule } from '../class-members/class-members.module'
import { User } from '../users/user.entity'
import { Student } from '../students/student.entity'
import { Notice } from '../school/school.entity'
import { Grade } from '../grades/grade.entity'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

class ClassesService extends CrudService<ClassItem> {
  constructor(
    @InjectRepository(ClassItem) repo: Repository<ClassItem>,
    private readonly classMemberSvc2: ClassMemberService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Notice) private readonly noticeRepo: Repository<Notice>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
  ) {
    super(repo)
    this.withClassMemberService(classMemberSvc2)
  }

  /** 班级是班级维度实体 */
  protected isClassScopedEntity(): boolean {
    return true
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
    // 删除班级同时清理所有学期的成员关系
    const members = await this.classMemberSvc.listByClass(id)
    for (const m of members) {
      await this.classMemberSvc.removeMember(m.teacherId, id, m.term)
    }
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

  /** 查询班级成员列表（含教师姓名） */
  async listMembers(classId: string, teacherId: string) {
    // 班主任或同班科任老师均可查看成员列表
    const canAccess = await this.classMemberSvc.canAccess(teacherId, classId)
    if (!canAccess) throw new ForbiddenException('无权访问该班级')
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
}

@Controller('classes')
class ClassesController extends CrudController<ClassItem> {
  constructor(private readonly s: ClassesService) {
    super(s)
  }

  /** 查询班级成员列表（用 POST 避免与基类 GET :id 路由冲突） */
  @Post(':id/members/list')
  listMembers(@Param('id') id: string, @CurrentTeacher() t: any) {
    return this.s.listMembers(id, t.sub)
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
}

@Module({
  imports: [TypeOrmModule.forFeature([ClassItem, User, Student, Notice, Grade]), ClassMembersModule],
  providers: [ClassesService],
  controllers: [ClassesController],
})
export class ClassesModule {}
