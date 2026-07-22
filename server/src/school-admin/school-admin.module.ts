import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SchoolAdmin } from './school-admin.entity'
import { User } from '../users/user.entity'
import { Student } from '../students/student.entity'
import { School } from '../school/school.entity'
import { ClassItem } from '../classes/class.entity'
import { SchoolAdminService } from './school-admin.service'
import { SchoolAdminController } from './school-admin.controller'

@Module({
  imports: [TypeOrmModule.forFeature([SchoolAdmin, User, Student, School, ClassItem])],
  providers: [SchoolAdminService],
  controllers: [SchoolAdminController],
  exports: [SchoolAdminService],
})
export class SchoolAdminModule {}
