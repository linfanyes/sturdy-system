import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  Controller,
  Post,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common'
import { SeatLayout } from './seat.entity'
import { Student } from '../students/student.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

class SeatsService extends CrudService<SeatLayout> {
  constructor(
    @InjectRepository(SeatLayout) repo: Repository<SeatLayout>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
  ) {
    super(repo)
  }

  /** 启用某座位布局，并把行列回写到学生记录 */
  async activateLayout(id: string, teacherId: string) {
    const layout = await this.findOne(id, teacherId)
    await this.repo.update(
      { classId: layout.classId, teacherId } as any,
      { active: false },
    )
    layout.active = true
    await this.repo.save(layout)

    const students = await this.studentRepo.find({
      where: { classId: layout.classId, teacherId } as any,
    })
    const posMap = new Map<string, { row: number; col: number }>()
    ;(layout.seats || []).forEach((rowArr, r) =>
      (rowArr || []).forEach((sid, c) => {
        if (sid) posMap.set(sid, { row: r + 1, col: c + 1 })
      }),
    )
    for (const st of students) {
      const pos = posMap.get(st.id)
      st.seatRow = pos?.row ?? null
      st.seatCol = pos?.col ?? null
      await this.studentRepo.save(st)
    }
    return layout
  }
}

@Controller('seat-layouts')
class SeatsController extends CrudController<SeatLayout> {
  constructor(s: SeatsService) {
    super(s)
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard)
  activate(@Param('id') id: string, @CurrentTeacher() t: any) {
    return (this.service as SeatsService).activateLayout(id, t.sub)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([SeatLayout, Student])],
  providers: [SeatsService],
  controllers: [SeatsController],
})
export class SeatsModule {}
