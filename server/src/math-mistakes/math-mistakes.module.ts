import { Module, UseGuards, Controller } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Entity, Column, Index } from 'typeorm'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { BaseEntity } from '../common/entities/base.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'

/**
 * 数学错题本（教师工具区「错题本」）。
 * 补历史缺口：前端 Web 错题本页面自始调用 /math-mistakes 接口，
 * 但后端从未实现该控制器，导致页面加载 404、新增/删除全部失败。
 */
@Index('idx_mistakes_cls', ['teacherId', 'classId'])
@Index('idx_mistakes_created', ['teacherId', 'createdAt'])
@Entity('math_mistakes')
export class MathMistake extends BaseEntity {
  @Column() classId: string
  @Column({ default: '' }) className: string
  @Column({ default: '' }) studentName: string
  @Column({ type: 'text', nullable: true }) question: string
  @Column({ type: 'text', nullable: true }) wrongAnswer: string
  @Column({ type: 'text', nullable: true }) correctAnswer: string
  @Column({ default: '' }) knowledgePoint: string
}

class Service extends CrudService<MathMistake> {
  constructor(@InjectRepository(MathMistake) repo: Repository<MathMistake>) { super(repo) }
}

@Roles('teacher')
@Feature('tools')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('math-mistakes')
class Ctrl extends CrudController<MathMistake> { constructor(s: Service) { super(s) } }

@Module({
  imports: [TypeOrmModule.forFeature([MathMistake])],
  providers: [Service],
  controllers: [Ctrl],
})
export class MathMistakesModule {}
