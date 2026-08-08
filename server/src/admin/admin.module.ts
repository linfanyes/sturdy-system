import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { LessonPlanTemplate } from './admin.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { User } from '../users/user.entity'
import { School } from '../school/school.entity'
import { SchoolAdmin } from '../school-admin/school-admin.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { AuditModule } from '../audit/audit.module'
import { ResourceLibraryModule } from '../resource-library/resource-library.module'
import { TextbookModule } from '../textbook/textbook.module'

// 说明：LessonObservation(/lesson-observations) 与 WorkLog(/work-logs) 的路由与实体
// 已收敛至 lesson-observation / work-log 模块（带 @Feature('observation'|'worklog') 守卫），
// 历史债 #1/#2：AdminModule 不再重复注册同名路由（此前注册顺序靠后导致 AdminModule
// 版本胜出且缺失功能包守卫，功能包开关实际失效）。

class PlanService extends CrudService<LessonPlanTemplate> {
  constructor(@InjectRepository(LessonPlanTemplate) repo: Repository<LessonPlanTemplate>) { super(repo) }
}
@Roles('teacher')
@Controller('lesson-plan-templates')
class PlanController extends CrudController<LessonPlanTemplate> { constructor(s: PlanService) { super(s) } }

@Module({
  imports: [
    TypeOrmModule.forFeature([LessonPlanTemplate, User, School, SchoolAdmin, ClassItem, Student, Grade, Exam]),
    AuditModule,
    // 资源库/教材初始化数据在 seedDemoData 中按校生成
    ResourceLibraryModule,
    TextbookModule,
  ],
  providers: [PlanService, AdminService],
  controllers: [PlanController, AdminController],
  exports: [AdminService],
})
export class AdminModule {}
