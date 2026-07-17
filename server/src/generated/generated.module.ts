import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import {
  GeneratedPaper,
  GeneratedLessonPlan,
  GeneratedKnowledge,
  PaperQueryDoc,
} from './generated.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

class PapersService extends CrudService<GeneratedPaper> {
  constructor(@InjectRepository(GeneratedPaper) repo: Repository<GeneratedPaper>) {
    super(repo)
  }
}
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
