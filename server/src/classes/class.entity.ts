import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Entity('classes')
export class ClassItem extends BaseEntity {
  @Column() name: string
  @Column() grade: string
  @Column() classNo: string
  @Column({ default: '' }) slogan: string
  @Column({ default: '' }) headTeacher: string
  @Column('simple-json', { nullable: true }) teachers: string[]
  @Column({ default: 'butter' }) color: string
  @Column({ default: '' }) term: string
  @Column('simple-json', { nullable: true }) subjects: string[]
}
