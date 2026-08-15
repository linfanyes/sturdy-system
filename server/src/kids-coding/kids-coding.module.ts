import { Module, UseGuards, Controller, Get, Post, Patch, Delete, Param, Body, NotFoundException, ForbiddenException } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DeepPartial } from 'typeorm'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { CodingProject } from './kids-coding.entity'
import { CreateCodingProjectDto, UpdateCodingProjectDto } from './dto/kids-coding.dto'
import { CurrentParent } from '../parent-auth/current-parent.decorator'

class CodingProjectService extends CrudService<CodingProject> {
  constructor(@InjectRepository(CodingProject) repo: Repository<CodingProject>) {
    super(repo)
  }
}

/** 教师端：少儿编程作品 CRUD（按 teacherId 隔离，@Feature 守卫保证该功能已开启） */
@Roles('teacher')
@Feature('kids-coding')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('kids-coding')
class CodingProjectController extends CrudController<CodingProject> {
  constructor(s: CodingProjectService) {
    super(s)
  }

  @Post()
  create(@Body() dto: CreateCodingProjectDto, @CurrentTeacher() t: any) {
    return super.create(dto as any, t)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCodingProjectDto, @CurrentTeacher() t: any) {
    return super.update(id, dto as any, t)
  }
}

/** 家长端：查看本班教师已开放的少儿编程作品（只读画廊）+ 学生自主练习作品的 CRUD */
@Roles('parent')
@Feature('kids-coding')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('parent/kids-coding')
class ParentCodingController {
  constructor(@InjectRepository(CodingProject) private readonly repo: Repository<CodingProject>) {}

  /** 教师发布到本班的少儿编程作品（只读画廊） */
  @Get()
  async listForParent(@CurrentParent() p: any) {
    const classId = p?.classId
    if (!classId) return []
    const rows = await this.repo.find({
      where: { classId, publishedToParent: true } as any,
      order: { updatedAt: 'DESC' },
    })
    return rows.map((r) => this.projectView(r))
  }

  /** 学生自主练习作品列表（仅本人可见，按 studentId 隔离） */
  @Get('mine')
  async listMine(@CurrentParent() p: any) {
    const studentId = p?.studentId
    if (!studentId) return []
    const rows = await this.repo.find({
      where: { studentId } as any,
      order: { updatedAt: 'DESC' },
    })
    return rows.map((r) => this.projectView(r))
  }

  /** 新建练习作品（归属当前学生，默认不发布、与教师作品隔离） */
  @Post()
  async createMine(@Body() dto: CreateCodingProjectDto, @CurrentParent() p: any) {
    const studentId = p?.studentId
    if (!studentId) throw new ForbiddenException('未关联学生，无法保存练习')
    const e = this.repo.create({
      title: dto.title || '未命名练习',
      description: dto.description ?? null,
      blocks: dto.blocks ?? null,
      studentId,
      teacherId: null,
      classId: null,
      publishedToParent: false,
      teacherName: null,
    } as DeepPartial<CodingProject>)
    const saved = await this.repo.save(e)
    return { id: saved.id }
  }

  /** 更新本人练习作品 */
  @Patch(':id')
  async updateMine(@Param('id') id: string, @Body() dto: UpdateCodingProjectDto, @CurrentParent() p: any) {
    const studentId = p?.studentId
    const e = await this.repo.findOne({ where: { id } as any })
    if (!e || e.studentId !== studentId) throw new NotFoundException('练习作品不存在')
    if (dto.title !== undefined) e.title = dto.title
    if (dto.description !== undefined) e.description = dto.description
    if (dto.blocks !== undefined) e.blocks = dto.blocks
    await this.repo.save(e)
    return { id: e.id }
  }

  /** 删除本人练习作品 */
  @Delete(':id')
  async removeMine(@Param('id') id: string, @CurrentParent() p: any) {
    const studentId = p?.studentId
    const e = await this.repo.findOne({ where: { id } as any })
    if (!e || e.studentId !== studentId) throw new NotFoundException('练习作品不存在')
    await this.repo.remove(e)
    return { id }
  }

  /** 教师发布作品的单个查看（只读） */
  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentParent() p: any) {
    const classId = p?.classId
    const r = await this.repo.findOne({ where: { id, classId, publishedToParent: true } as any })
    if (!r) throw new NotFoundException('作品不存在或未开放')
    return this.projectView(r)
  }

  /** 家长端仅暴露必要字段，避免泄露教师私有信息 */
  private projectView(r: CodingProject) {
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      blocks: r.blocks,
      teacherName: r.teacherName,
      updatedAt: r.updatedAt,
    }
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([CodingProject])],
  providers: [CodingProjectService],
  controllers: [CodingProjectController, ParentCodingController],
})
export class KidsCodingModule {}
