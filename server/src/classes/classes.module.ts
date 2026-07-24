import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { ClassItem } from './class.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { ClassMemberService, ClassMembersModule } from '../class-members/class-members.module'

class ClassesService extends CrudService<ClassItem> {
  constructor(
    @InjectRepository(ClassItem) repo: Repository<ClassItem>,
    classMemberSvc: ClassMemberService,
  ) {
    super(repo)
    this.withClassMemberService(classMemberSvc)
  }

  /** 班级是班级维度实体 */
  protected isClassScopedEntity(): boolean {
    return true
  }

  /** 创建班级时自动写入 class_members head 记录 */
  async create(teacherId: string, dto: any) {
    const e = await super.create(teacherId, dto)
    // 自动写入班主任成员关系
    if (this.classMemberSvc) {
      await this.classMemberSvc.addHeadTeacher(teacherId, e.id, e.name, (e as any).subjects || [])
    }
    return e
  }
}

@Controller('classes')
class ClassesController extends CrudController<ClassItem> {
  constructor(s: ClassesService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([ClassItem]), ClassMembersModule],
  providers: [ClassesService],
  controllers: [ClassesController],
})
export class ClassesModule {}
