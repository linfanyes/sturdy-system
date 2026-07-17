import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Entity('award_records')
export class AwardRecord extends BaseEntity {
  @Column() name: string
  @Column({ default: '' }) issuer: string
  @Column({ default: '' }) date: string
  @Column({ default: '' }) level: string
  @Column({ type: 'text', nullable: true }) image: string
  @Column('simple-json', { default: '[]' }) tags: string[]
  @Column({ type: 'text', default: '' }) note: string
  @Column({ type: 'int', nullable: true }) ratingScore: number
}

@Entity('award_categories')
export class AwardCategory extends BaseEntity {
  @Column() name: string
  @Column({ default: '' }) color: string
}
