import { Module, UseGuards, Controller, Get, Post, Patch, Param, Body, NotFoundException } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
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

/** 家长端：只读查看本班已开放的少儿编程作品（默认不开放，需班级家长功能包含 kids-coding） */
@Roles('parent')
@Feature('kids-coding')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('parent/kids-coding')
class ParentCodingController {
  constructor(@InjectRepository(CodingProject) private readonly repo: Repository<CodingProject>) {}

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
