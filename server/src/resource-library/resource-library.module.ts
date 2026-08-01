import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Poem, MathFormula, EnglishWord } from './resource-library.entity'
import { User } from '../users/user.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { ResourceLibraryService } from './resource-library.service'
import { SchoolAdminResourceLibraryController, ResourceLibraryController } from './resource-library.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Poem, MathFormula, EnglishWord, User, ClassItem, Student])],
  controllers: [SchoolAdminResourceLibraryController, ResourceLibraryController],
  providers: [ResourceLibraryService],
  exports: [ResourceLibraryService],
})
export class ResourceLibraryModule {}
