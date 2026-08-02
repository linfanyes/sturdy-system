import { Module, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Entity, Column, Index } from 'typeorm'
import { Controller } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { BaseEntity } from '../common/entities/base.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'

// 工作日志实体：唯一权威定义（历史债 #2 修复后，admin.entity 不再重复定义）。
@Index('idx_adm_tch', ['teacherId'])
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

@Roles('teacher')
@Feature('worklog')
@UseGuards(JwtAuthGuard, FeatureGuard)
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
