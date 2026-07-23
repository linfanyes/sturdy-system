import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Entity, Column, Index } from 'typeorm'
import { Controller } from '@nestjs/common'
import { BaseEntity } from '../common/entities/base.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

@Index('idx_teacher_student', ['teacherId', 'studentId'])
@Index('idx_home_visits_cov', ['teacherId', 'createdAt'])
@Entity('home_visits')
export class HomeVisit extends BaseEntity {
  @Column() studentId: string
  @Column() studentName: string
  @Column({ default: '' }) address: string
  @Column() date: string
  @Column({ type: 'text', nullable: true }) content: string
  @Column({ type: 'text', nullable: true }) followUp: string
  @Column({ default: 'planned' }) status: string // planned/completed/cancelled
  @Column('simple-json', { nullable: true }) photos: string[]
}

class Svc extends CrudService<HomeVisit> { constructor(@InjectRepository(HomeVisit) r: Repository<HomeVisit>) { super(r) } }
@Controller('home-visits') class Ctrl extends CrudController<HomeVisit> { constructor(s: Svc) { super(s) } }

@Module({ imports: [TypeOrmModule.forFeature([HomeVisit])], providers: [Svc], controllers: [Ctrl] })
export class HomeVisitModule {}
