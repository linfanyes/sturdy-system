import { Module, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { NoteItem, TodoItem, PickerHistory } from './notes.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'

class NoteService extends CrudService<NoteItem> {
  constructor(@InjectRepository(NoteItem) repo: Repository<NoteItem>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('notes')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('notes')
class NoteController extends CrudController<NoteItem> {
  constructor(s: NoteService) {
    super(s)
  }
}

class TodoService extends CrudService<TodoItem> {
  constructor(@InjectRepository(TodoItem) repo: Repository<TodoItem>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('todos')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('todos')
class TodoController extends CrudController<TodoItem> {
  constructor(s: TodoService) {
    super(s)
  }
}

class PickerService extends CrudService<PickerHistory> {
  constructor(@InjectRepository(PickerHistory) repo: Repository<PickerHistory>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('picker_history')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('picker-history')
class PickerController extends CrudController<PickerHistory> {
  constructor(s: PickerService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([NoteItem, TodoItem, PickerHistory])],
  providers: [NoteService, TodoService, PickerService],
  controllers: [NoteController, TodoController, PickerController],
})
export class NotesModule {}
