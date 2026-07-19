import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { ParentContact, NoticeTemplate } from './parent-contact.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

// 基类 CrudController.findAll 已支持 ?classId= 过滤，此处无需覆盖
class ParentContactService extends CrudService<ParentContact> {
  constructor(@InjectRepository(ParentContact) repo: Repository<ParentContact>) {
    super(repo)
  }
}
@Controller('parent-contacts')
class ParentContactController extends CrudController<ParentContact> {
  constructor(s: ParentContactService) {
    super(s)
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
