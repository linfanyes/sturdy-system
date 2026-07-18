import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Entity('class_galleries')
export class ClassGallery extends BaseEntity {
  @Column() classId: string
  @Column() title: string
  @Column({ type: 'text', nullable: true }) description: string
  @Column({ default: '' }) date: string
  // 图片以 base64 dataURL 数组直存（小程序云托管私有链路下无对象存储，直存 text 字段保证可靠显示）
  @Column('simple-json', { nullable: true }) photos: string[]
}
