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

@Index('idx_rdl_tch_stu', ['teacherId', 'studentId'])
@Index('idx_rdl_tch_class', ['teacherId', 'classId'])
@Index('idx_reading_logs_cov', ['teacherId', 'createdAt'])
@Entity('reading_logs')
export class ReadingLog extends BaseEntity {
  // 关联真实学生ID。手工录入未选学生时可空。
  @Column({ type: 'varchar', length: 64, nullable: true })
  studentId?: string
  // 归属班级（可选，便于按班级筛选归档）
  @Column({ type: 'varchar', length: 64, nullable: true })
  classId?: string
  @Column() studentName: string
  @Column() bookTitle: string
  @Column({ default: '' }) author: string
  @Column({ type: 'int', default: 0 }) pages: number
  @Column({ type: 'int', default: 0 }) minutes: number
  @Column() date: string
  @Column({ type: 'text', nullable: true }) note: string
}

class Service extends CrudService<ReadingLog> {
  constructor(@InjectRepository(ReadingLog) repo: Repository<ReadingLog>) { super(repo) }
}
@Roles('teacher')
@Feature('reading')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('reading-logs')
class Ctrl extends CrudController<ReadingLog> { constructor(s: Service) { super(s) } }

@Module({
  imports: [TypeOrmModule.forFeature([ReadingLog])],
  providers: [Service],
  controllers: [Ctrl],
})
export class ReadingLogModule {}
