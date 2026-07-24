import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller, Post, Delete, Param, Body, BadRequestException, ForbiddenException } from '@nestjs/common'
import { ClassItem } from './class.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { ClassMemberService, ClassMembersModule } from '../class-members/class-members.module'
import { User } from '../users/user.entity'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

class ClassesService extends CrudService<ClassItem> {
  constructor(
    @InjectRepository(ClassItem) repo: Repository<ClassItem>,
    private readonly classMemberSvc2: ClassMemberService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
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
   */
  async remove(id: string, teacherId: string) {
    await this.assertHeadTeacher(teacherId, id)
    // 删除班级同时清理成员关系
    const members = await this.classMemberSvc.listByClass(id)
    for (const m of members) {
      await this.classMemberSvc.removeMember(m.teacherId, id)
    }
    return super.remove(id, teacherId)
  }

  /** 校验当前教师是该班级的班主任（role='head'） */
  private async assertHeadTeacher(teacherId: string, classId: string) {
    const role = await this.classMemberSvc.getRole(teacherId, classId)
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

  /** 班主任添加科任老师到班级 */
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
    await this.classMemberSvc.addSubjectTeacher(body.teacherId, classId, cls.name, body.subjects || [])
    return { ok: true }
  }

  /** 班主任移除科任老师 */
  async removeSubjectTeacher(classId: string, headTeacherId: string, memberTeacherId: string) {
    await this.assertHeadTeacher(headTeacherId, classId)
    // 不能移除自己（班主任）
    if (memberTeacherId === headTeacherId) {
      throw new BadRequestException('不能移除自己（班主任），如需转交请联系学校管理员')
    }
    // 校验被移除者不是班主任
    const targetRole = await this.classMemberSvc.getRole(memberTeacherId, classId)
    if (targetRole === 'head') {
      throw new BadRequestException('不能移除班主任，如需转交请联系学校管理员')
    }
    await this.classMemberSvc.removeMember(memberTeacherId, classId)
    return { ok: true }
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
}

@Module({
  imports: [TypeOrmModule.forFeature([ClassItem, User]), ClassMembersModule],
  providers: [ClassesService],
  controllers: [ClassesController],
})
export class ClassesModule {}
