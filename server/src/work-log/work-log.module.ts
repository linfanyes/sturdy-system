import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Entity, Column } from 'typeorm'
import { Controller } from '@nestjs/common'
import { BaseEntity } from '../common/entities/base.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

@Entity('work_logs')
export class WorkLog extends BaseEntity {
  @Column() date: string
  @Column({ type: 'int', default: 0 }) classCount: number
  @Column({ type: 'int', default: 0 }) homeworkCount: number
  @Column({ type: 'text', nullable: true }) content: string
  @Column({ type: 'text', nullable: true }) note: string
}

class WorkLogService extends CrudService<WorkLog> {
  constructor(@InjectRepository(WorkLog) repo: Repository<WorkLog>) {
    super(repo)
  }
}

@Controller('work-logs')
class WorkLogController extends CrudController<WorkLog> {
  constructor(s: WorkLogService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([WorkLog])],
  providers: [WorkLogService],
  controllers: [WorkLogController],
})
export class WorkLogModule {}
