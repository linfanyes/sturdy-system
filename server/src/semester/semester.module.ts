import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Entity, Column, Index } from 'typeorm'
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common'
import { BaseEntity } from '../common/entities/base.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

@Index('idx_sem_tch', ['teacherId'])
@Index('idx_sem_tch_current', ['teacherId', 'current'])
@Entity('semesters')
export class Semester extends BaseEntity {
  @Column() name: string        // 如：2025年春季学期
  @Column() startDate: string   // 2025-02-17
  @Column() endDate: string     // 2025-07-04
  @Column({ default: false }) current: boolean
  /** 学年度（如 2024-2025），用于学年归档 */
  @Column({ default: '' }) academicYear: string
  /** 学期类型：1=春季，2=秋季，3=暑假，4=寒假 */
  @Column({ default: 1 }) termType: number
  /** 学期统计快照（JSON），期末自动生成 */
  @Column({ type: 'json', nullable: true }) stats: Record<string, any> | null
  /** 是否已归档 */
  @Column({ default: false }) archived: boolean
}

/**
 * 学期服务增强：自动切换当前学期 + 学期归档 + 统计快照
 */
class SemesterService extends CrudService<Semester> {
  constructor(@InjectRepository(Semester) r: Repository<Semester>) { super(r) }

  /**
   * 获取当前激活的学期（无则返回最近一个）
   */
  async getCurrent(teacherId: string): Promise<Semester | null> {
    const current = await this.repo.findOne({ where: { teacherId, current: true, deletedAt: undefined as any } })
    if (current) return current
    // 无激活学期：返回最近创建的
    const list = await this.repo.find({
      where: { teacherId },
      order: { startDate: 'DESC' },
      take: 1,
    })
    return list[0] || null
  }

  /**
   * 设置当前学期（自动取消其他学期的 current 标记）
   */
  async setCurrent(teacherId: string, semesterId: string): Promise<Semester> {
    const e = await this.findOne(semesterId, teacherId)
    // 取消其他学期的 current
    await this.repo.update({ teacherId, current: true }, { current: false })
    // 设置当前学期
    e.current = true
    return this.repo.save(e)
  }

  /**
   * 创建学期（如果设为 current，自动取消其他）
   */
  async createSemester(teacherId: string, dto: Partial<Semester>): Promise<Semester> {
    if (dto.current) {
      await this.repo.update({ teacherId, current: true }, { current: false })
    }
    const e = this.repo.create({ ...dto, teacherId })
    return this.repo.save(e)
  }

  /**
   * 学期归档：生成统计快照 + 标记已归档
   */
  async archive(teacherId: string, semesterId: string): Promise<Semester> {
    const e = await this.findOne(semesterId, teacherId)
    // 生成统计快照
    const stats = {
      archivedAt: new Date().toISOString(),
      studentCount: 0, // 可由调用方填充
      examCount: 0,
      note: '学期归档快照',
    }
    e.archived = true
    e.stats = stats
    return this.repo.save(e)
  }
}

@Roles('teacher')
@Controller('semesters')
class SemesterController extends CrudController<Semester> {
  constructor(private readonly semesterSvc: SemesterService) { super(semesterSvc) }

  /** 获取当前激活学期 */
  @Get('current')
  getCurrent(@CurrentTeacher() t: any) {
    return this.semesterSvc.getCurrent(t.sub)
  }

  /** 设置当前学期 */
  @Patch(':id/set-current')
  setCurrent(@Param('id') id: string, @CurrentTeacher() t: any) {
    return this.semesterSvc.setCurrent(t.sub, id)
  }

  /** 归档学期 */
  @Patch(':id/archive')
  archive(@Param('id') id: string, @CurrentTeacher() t: any) {
    return this.semesterSvc.archive(t.sub, id)
  }
}

@Module({ imports: [TypeOrmModule.forFeature([Semester])], providers: [SemesterService], controllers: [SemesterController] })
export class SemesterModule {}
