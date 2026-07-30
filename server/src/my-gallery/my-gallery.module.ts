import { Module, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Entity, Column, ValueTransformer, Index } from 'typeorm'
import { Controller } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { BaseEntity } from '../common/entities/base.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'

const jsonArrayTransformer: ValueTransformer = {
  to: (value: string[]) => (value ? JSON.stringify(value) : null),
  from: (value: string) => {
    if (!value) return []
    try { return JSON.parse(value) } catch { return [] }
  },
}

@Index('idx_mgl_tch', ['teacherId'])
@Entity('my_galleries')
export class MyGallery extends BaseEntity {
  @Column() title: string
  @Column({ nullable: true }) date: string
  @Column({ type: 'text', nullable: true }) description: string
  @Column({ type: 'longtext', nullable: true, transformer: jsonArrayTransformer }) photos: string[]
}

class Svc extends CrudService<MyGallery> { constructor(@InjectRepository(MyGallery) r: Repository<MyGallery>) { super(r) } }
@Roles('teacher')
@Feature('gallery')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('my-galleries') class Ctrl extends CrudController<MyGallery> { constructor(s: Svc) { super(s) } }

@Module({ imports: [TypeOrmModule.forFeature([MyGallery])], providers: [Svc], controllers: [Ctrl] })
export class MyGalleryModule {}
