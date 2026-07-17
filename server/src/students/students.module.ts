import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { Student } from './student.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

class StudentsService extends CrudService<Student> {
  constructor(@InjectRepository(Student) repo: Repository<Student>) {
    super(repo)
  }
}

@Controller('students')
class StudentsController extends CrudController<Student> {
  constructor(s: StudentsService) {
    super(s)
  }

  /** 批量导入：循环创建，返回新建的 id 列表 */
  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  async bulk(@Body() body: { items: any[] }, @CurrentTeacher() t: any) {
    const ids: string[] = []
    for (const item of body.items || []) {
      const created = await this.service.create(t.sub, item)
      ids.push(created.id)
    }
    return { count: ids.length, ids }
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Student])],
  providers: [StudentsService],
  controllers: [StudentsController],
})
export class StudentsModule {}
