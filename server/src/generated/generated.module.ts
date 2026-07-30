import { Module, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import {
  GeneratedPaper,
  GeneratedLessonPlan,
  GeneratedKnowledge,
  PaperQueryDoc,
} from './generated.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'

class PapersService extends CrudService<GeneratedPaper> {
  constructor(@InjectRepository(GeneratedPaper) repo: Repository<GeneratedPaper>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('ai')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('generated/papers')
class PapersController extends CrudController<GeneratedPaper> {
  constructor(s: PapersService) {
    super(s)
  }
}

class PlansService extends CrudService<GeneratedLessonPlan> {
  constructor(
    @InjectRepository(GeneratedLessonPlan) repo: Repository<GeneratedLessonPlan>,
  ) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('ai')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('generated/lesson-plans')
class PlansController extends CrudController<GeneratedLessonPlan> {
  constructor(s: PlansService) {
    super(s)
  }
}

class KnowledgeService extends CrudService<GeneratedKnowledge> {
  constructor(
    @InjectRepository(GeneratedKnowledge) repo: Repository<GeneratedKnowledge>,
  ) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('ai')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('generated/knowledges')
class KnowledgeController extends CrudController<GeneratedKnowledge> {
  constructor(s: KnowledgeService) {
    super(s)
  }
}

class QueryService extends CrudService<PaperQueryDoc> {
  constructor(@InjectRepository(PaperQueryDoc) repo: Repository<PaperQueryDoc>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('ai')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('generated/queries')
class QueryController extends CrudController<PaperQueryDoc> {
  constructor(s: QueryService) {
    super(s)
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GeneratedPaper,
      GeneratedLessonPlan,
      GeneratedKnowledge,
      PaperQueryDoc,
    ]),
  ],
  providers: [PapersService, PlansService, KnowledgeService, QueryService],
  controllers: [PapersController, PlansController, KnowledgeController, QueryController],
})
export class GeneratedModule {}
