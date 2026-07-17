import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import {
  ScheduleItem,
  Attendance,
  Homework,
  Notice,
  Resource,
} from './school.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

class ScheduleService extends CrudService<ScheduleItem> {
  constructor(@InjectRepository(ScheduleItem) repo: Repository<ScheduleItem>) {
    super(repo)
  }
}
@Controller('schedules')
class ScheduleController extends CrudController<ScheduleItem> {
  constructor(s: ScheduleService) {
    super(s)
  }
}

class AttendanceService extends CrudService<Attendance> {
  constructor(@InjectRepository(Attendance) repo: Repository<Attendance>) {
    super(repo)
  }
}
@Controller('attendances')
class AttendanceController extends CrudController<Attendance> {
  constructor(s: AttendanceService) {
    super(s)
  }
}

class HomeworkService extends CrudService<Homework> {
  constructor(@InjectRepository(Homework) repo: Repository<Homework>) {
    super(repo)
  }
}
@Controller('homework')
class HomeworkController extends CrudController<Homework> {
  constructor(s: HomeworkService) {
    super(s)
  }
}

class NoticeService extends CrudService<Notice> {
  constructor(@InjectRepository(Notice) repo: Repository<Notice>) {
    super(repo)
  }
}
@Controller('notices')
class NoticeController extends CrudController<Notice> {
  constructor(s: NoticeService) {
    super(s)
  }
}

class ResourceService extends CrudService<Resource> {
  constructor(@InjectRepository(Resource) repo: Repository<Resource>) {
    super(repo)
  }
}
@Controller('resources')
class ResourceController extends CrudController<Resource> {
  constructor(s: ResourceService) {
    super(s)
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduleItem, Attendance, Homework, Notice, Resource]),
  ],
  providers: [ScheduleService, AttendanceService, HomeworkService, NoticeService, ResourceService],
  controllers: [ScheduleController, AttendanceController, HomeworkController, NoticeController, ResourceController],
})
export class SchoolModule {}
