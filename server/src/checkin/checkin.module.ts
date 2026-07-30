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

@Index('idx_chk_tch_stu', ['teacherId', 'studentId'])
@Index('idx_checkins_cov', ['teacherId', 'createdAt'])
@Entity('checkins')
export class Checkin extends BaseEntity {
  @Column() studentId: string
  @Column() studentName: string
  @Column() type: string    // reading/sport/behavior/homework
  @Column() date: string
  @Column({ type: 'int', default: 1 }) count: number
  @Column({ type: 'text', nullable: true }) note: string
}

class Svc extends CrudService<Checkin> { constructor(@InjectRepository(Checkin) r: Repository<Checkin>) { super(r) } }
@Roles('teacher')
@Feature('checkin')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('checkins') class Ctrl extends CrudController<Checkin> { constructor(s: Svc) { super(s) } }

@Module({ imports: [TypeOrmModule.forFeature([Checkin])], providers: [Svc], controllers: [Ctrl] })
export class CheckinModule {}
