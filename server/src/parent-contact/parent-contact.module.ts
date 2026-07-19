import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller, Get, Query } from '@nestjs/common'
import { ParentContact, NoticeTemplate } from './parent-contact.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

class ParentContactService extends CrudService<ParentContact> {
  constructor(@InjectRepository(ParentContact) repo: Repository<ParentContact>) {
    super(repo)
  }

  /** 按班级过滤：传入 classId 仅返回该班联系记录；未传则返回当前教师全部 */
  findAllByClass(teacherId: string, classId?: string): Promise<ParentContact[]> {
    const where: any = { teacherId }
    if (classId) where.classId = classId
    return this.repo.find({
      where,
      order: { createdAt: 'DESC' } as any,
    })
  }
}
@Controller('parent-contacts')
class ParentContactController extends CrudController<ParentContact> {
  constructor(s: ParentContactService) {
    super(s)
  }

  /** 覆盖默认 findAll：支持 ?classId= 班级过滤 */
  @Get()
  findAll(@CurrentTeacher() t: any, @Query('classId') classId?: string) {
    return (this.service as ParentContactService).findAllByClass(t.sub, classId)
  }
}

class NoticeTemplateService extends CrudService<NoticeTemplate> {
  constructor(@InjectRepository(NoticeTemplate) repo: Repository<NoticeTemplate>) {
    super(repo)
  }
}
@Controller('notice-templates')
class NoticeTemplateController extends CrudController<NoticeTemplate> {
  constructor(s: NoticeTemplateService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([ParentContact, NoticeTemplate])],
  providers: [ParentContactService, NoticeTemplateService],
  controllers: [ParentContactController, NoticeTemplateController],
})
export class ParentContactModule {}
