import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Entity, Column, Index } from 'typeorm'
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common'
import { BaseEntity } from '../common/entities/base.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

@Index('idx_teacher', ['teacherId'])
@Entity('semesters')
export class Semester extends BaseEntity {
  @Column() name: string        // 如：2025年春季学期
  @Column() startDate: string   // 2025-02-17
  @Column() endDate: string     // 2025-07-04
  @Column({ default: false }) current: boolean
}

class Svc extends CrudService<Semester> { constructor(@InjectRepository(Semester) r: Repository<Semester>) { super(r) } }
@Controller('semesters') class Ctrl extends CrudController<Semester> { constructor(s: Svc) { super(s) } }

@Module({ imports: [TypeOrmModule.forFeature([Semester])], providers: [Svc], controllers: [Ctrl] })
export class SemesterModule {}
