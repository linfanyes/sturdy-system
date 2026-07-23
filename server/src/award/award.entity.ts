import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Index('idx_teacher', ['teacherId'])
@Entity('award_records')
export class AwardRecord extends BaseEntity {
  @Column() name: string
  @Column({ default: '' }) issuer: string
  @Column({ default: '' }) date: string
  @Column({ default: '' }) level: string
  @Column({ type: 'text', nullable: true }) image: string
  @Column('simple-json', { nullable: true }) tags: string[]
  @Column({ type: 'text', nullable: true }) note: string
  @Column({ type: 'int', nullable: true }) ratingScore: number
}

@Index('idx_teacher', ['teacherId'])
@Entity('award_categories')
export class AwardCategory extends BaseEntity {
  @Column() name: string
  @Column({ default: '' }) color: string
}
