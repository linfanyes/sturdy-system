import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { NoteItem, TodoItem, PickerHistory } from './notes.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

class NoteService extends CrudService<NoteItem> {
  constructor(@InjectRepository(NoteItem) repo: Repository<NoteItem>) {
    super(repo)
  }
}
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
