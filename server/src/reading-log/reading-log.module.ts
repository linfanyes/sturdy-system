import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Entity, Column } from 'typeorm'
import { Controller } from '@nestjs/common'
import { BaseEntity } from '../common/entities/base.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

@Entity('reading_logs')
export class ReadingLog extends BaseEntity {
  @Column() studentId: string
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
@Controller('reading-logs')
class Ctrl extends CrudController<ReadingLog> { constructor(s: Service) { super(s) } }

@Module({
  imports: [TypeOrmModule.forFeature([ReadingLog])],
  providers: [Service],
  controllers: [Ctrl],
})
export class ReadingLogModule {}
